# SocketIO 流式片段信息响应至界面

## 概述

将消息发送从阻塞式（HTTP POST 等待完整 LLM 响应后一次推送）改为流式（立即返回，通过 SocketIO 逐片推送 content chunks 至前端），实现打字机效果。

## 数据流

```
Frontend                     Backend
   │                           │
   │── HTTP POST ──────────►   │  POST /api/conversations/{uuid}/messages
   │   {content, client_msg_id}│  {client_msg_id: "xxx_assistant"}
   │                           │
   │◄── 202 Accepted ────────  │  立即返回
   │                           │
   │                           │  ─► LLMClient.chatStream() 开始 SSE 流式读
   │                           │
   │◄── SocketIO stream_event ─│  {type:"chunk", content:"你好", client_msg_id}
   │◄── SocketIO stream_event ─│  {type:"chunk", content:"世界", client_msg_id}
   │              ...          │
   │◄── SocketIO stream_event ─│  {type:"done", message_uuid, client_msg_id}
   │                           │  (同时落库)
```

## 变更清单

### 1. `LLMClient.java`

**文件位置:** `backend/src/main/java/com/fast/agent/runtime/LLMClient.java`

**问题:** `chatStream()` 使用 `bodyToMono(String.class)` 阻塞等待完整 body 后再拆分——不是真正的流式。

**修改:**
- 改用 `bodyToFlux(new ParameterizedTypeReference<ServerSentEvent<String>>() {})` 实现 SSE 逐事件解析
- 新增 `parseSSEData(String data)` 方法：解析 `data:` 行中的 JSON，提取 `choices[0].delta.content`
- 过滤 `[DONE]` 和空内容
- 签名不变: `public Flux<String> chatStream(List<Map<String, String>> messages)`

### 2. `LLMAgent.java`

**文件位置:** `backend/src/main/java/com/fast/agent/runtime/LLMAgent.java`

**问题:** `processStreamFluxWithCallback()` 内部调用 `llmAdapter.chat()`（阻塞版），未使用流式能力。

**修改:**
- 将 `processStreamFluxWithCallback()` 中 LLM 调用改为 `llmAdapter.chatStream()`
- content chunks 通过 `callback.onChunk(chunk)` 逐片回调
- 工具调用轮次保持同步（首版不做工具调用的流式）

### 3. `SocketIOPushService.java`

**文件位置:** `backend/src/main/java/com/fast/agent/service/SocketIOPushService.java`

**新增方法:**
```java
public void pushStreamEvent(String conversationUuid, Map<String, Object> data)
```
- 推送到 `conversation:{uuid}` room，事件名 `stream_event`
- data 包含 `type`（"start"|"chunk"|"done"|"error"）、`content`、`client_msg_id`、`message_uuid` 等字段
- 保持与旧 `pushStreamChunk`/`pushStreamDone` 方法共存（后续可清理）

### 4. `ConversationService.java`

**文件位置:** `backend/src/main/java/com/fast/agent/service/ConversationService.java`

**修改 `send()` 方法:**
- 新增 `clientMsgId` 参数
- 先插入用户消息到 DB
- 推 `{type:"start", client_msg_id}` 事件
- 调用 `llmClient.chatStream()`，每收到 chunk 推 `{type:"chunk", content, client_msg_id}`
- 流结束后插入助手消息到 DB
- 推 `{type:"done", message_uuid, client_msg_id}` 事件
- HTTP 返回完整 response（前端可能不需要，但保持后向兼容）

**取消 `generateResponse()` 和 `streamResponse()`**（不再需要，被 `send()` 取代）。

### 5. `ConversationController.java`

**文件位置:** `backend/src/main/java/com/fast/agent/rest/ConversationController.java`

**修改 `sendMessage()`:**
- 提取请求中的 `client_msg_id` 字段
- 传递给 `conversationService.send(conversationUuid, content, clientMsgId)`

### 6. 前端 `page.tsx`

**文件位置:** `frontend/src/app/(authenticated)/page.tsx`

**修改:**
- 删除对 `new_message`、`stream_chunk`、`agent_progress`、`sync` 四个事件的监听
- 改为只监听 1 个 `stream_event` 事件，handler 调用 `handleWsMessage`
- `handleWsMessage` 不变（已支持 `{type, content, client_msg_id}` 格式）

## 边界情况

| 场景 | 处理 |
|------|------|
| LLM 流式中断 | 前端检测到 loading 超时，显示错误提示 |
| LLM 返回空内容 | 推 `{type:"done", content:""}`，前端正常收尾 |
| 用户切换对话时还在流式 | 通过 `leaveRoom` 取消当前 room 的监听 |
| HTTP 请求成功但 SocketIO 断连 | HTTP 返回完整 response 作为 fallback |
| 并发消息 | 通过 `client_msg_id` 区分不同消息的 chunks |

## 不变的内容

- `socket.ts` — 无需修改
- HTTP API 端点路径不变
- 数据库表结构不变
- 认证/鉴权逻辑不变
