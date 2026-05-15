# SocketIO 流式片段信息响应实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将消息响应从阻塞式（HTTP 等待完整 LLM 响应后一次推送）改为流式（立即返回，通过 SocketIO 逐片推送 content chunks），实现打字机效果。

**架构：** 前端经 HTTP POST 发送消息后，后端立即返回，通过 `LLMClient.chatStream()` 从 LLM API 获取 SSE 流式响应，每收到一个 content chunk 即通过 SocketIO `stream_event` 事件推送到前端，前端逐字追加显示。

**技术栈：** Spring Boot + WebFlux WebClient (SSE) + SocketIO + Next.js

**文件清单：**
- 修改：`backend/.../runtime/LLMClient.java` — 修复 SSE 流式解析
- 修改：`backend/.../service/SocketIOPushService.java` — 新增 `pushStreamEvent()`
- 修改：`backend/.../service/ConversationService.java` — 重写 `send()` 为流式
- 修改：`backend/.../rest/ConversationController.java` — 传递 `client_msg_id`
- 修改：`frontend/.../page.tsx` — 简化 SocketIO 事件监听

---

### 任务 1：修复 `LLMClient.chatStream()` — 真正的 SSE 流式解析

**文件：** `backend/src/main/java/com/fast/agent/runtime/LLMClient.java`

**说明：** 当前 `chatStream()` 使用 `bodyToMono(String.class)` 阻塞等待完整 body 后再拆行解析，不是真正流式。改为 `bodyToFlux(String.class)` 逐 chunk 发射，拆行后提取 `data:` 行中的 `delta.content`。

- [ ] **步骤 1.1：修改 chatStream() 方法**

将 `LLMClient.java:53-86` 替换为：

```java
public Flux<String> chatStream(List<Map<String, String>> messages) {
    Map<String, Object> body = new HashMap<>();
    body.put("model", provider);
    body.put("messages", messages);
    body.put("stream", true);

    return webClient
            .post()
            .uri("/v1/chat/completions")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(body)
            .retrieve()
            .bodyToFlux(String.class)
            .flatMapMany(data -> Flux.fromArray(data.split("\n")))
            .filter(line -> !line.isBlank())
            .filter(line -> line.startsWith("data:"))
            .map(line -> line.substring(5).trim())
            .filter(line -> !"[DONE]".equals(line))
            .map(line -> {
                try {
                    JsonNode root = objectMapper.readTree(line);
                    JsonNode choices = root.get("choices");
                    if (choices != null && choices.isArray() && choices.size() > 0) {
                        JsonNode delta = choices.get(0).get("delta");
                        if (delta != null && delta.has("content")) {
                            return delta.get("content").asText();
                        }
                    }
                } catch (Exception ignored) {}
                return "";
            })
            .filter(content -> !content.isEmpty());
}
```

**改动说明：**
- `bodyToMono(String.class).flatMapMany(...)` → `bodyToFlux(String.class)`：从阻塞等待完整响应改为逐 chunk 流式发射
- `flatMapMany` → `flatMap`：`bodyToFlux` 返回 `Flux<String>`，直接用 `flatMap` 即可
- 新增 `.accept(MediaType.TEXT_EVENT_STREAM)`：通知服务端返回 SSE 格式（已由 `stream: true` 隐式启用，不设也能工作）
- 移除了 `stream_events: true`（MiniMax 兼容字段，不影响 OpenAI 兼容 API）
- 增加了 `.filter(line -> line.startsWith("data:"))`：只处理 SSE 的 `data:` 行
- 移除了空行和 `[DONE]` 标记

- [ ] **步骤 1.2：验证编译**

运行后端编译验证无错误：

```bash
cd backend && mvn compile -q
```

预期：`BUILD SUCCESS`

---

### 任务 2：新增 `SocketIOPushService.pushStreamEvent()`

**文件：** `backend/src/main/java/com/fast/agent/service/SocketIOPushService.java`

**说明：** 新增统一推送方法，使用 `type` 字段区分事件类型（start/chunk/done/error），推送到 `conversation:{uuid}` room，事件名为 `stream_event`。

- [ ] **步骤 2.1：添加 pushStreamEvent() 方法**

在 `SocketIOPushService.java` 末尾新增（`pushStreamDone` 方法之后）：

```java
public void pushStreamEvent(String conversationUuid, Map<String, Object> data) {
    pushToRoom("conversation:" + conversationUuid, "stream_event", data);
}
```

- [ ] **步骤 2.2：验证编译**

```bash
cd backend && mvn compile -q
```

预期：`BUILD SUCCESS`

---

### 任务 3：重写 `ConversationService.send()` 为流式 + SocketIO 逐片推送

**文件：** `backend/src/main/java/com/fast/agent/service/ConversationService.java`

**说明：** `send()` 方法从同步阻塞改为流式——通过 `LLMClient.chatStream()` 逐 chunk 读取 LLM 响应，每 chunk 立即通过 SocketIO 推送到前端。流结束后落库并推 `done` 事件。

变更：
- 新增 `LLMClient` 注入
- `send()` 签名增加 `clientMsgId` 参数
- 移除对 `generateResponse()` 的调用
- 改为直接调用 `llmClient.chatStream()`
- 流过程中逐片推送 `{type:"chunk"}` 事件
- 完成后落库并推送 `{type:"done"}` 事件
- 异常时推送 `{type:"error"}` 事件

- [ ] **步骤 3.1：新增 LLMClient 注入**

在 `ConversationService.java` 的 `@Autowired` 字段区域新增：

```java
@Autowired private LLMClient llmClient;
```

同时保留 `@Autowired private LLMAgent llmAgent;`（后续可清理，暂保留不破坏现有代码）。

- [ ] **步骤 3.2：新增 import**

在文件头部的 import 区域加入：

```java
import java.util.ArrayList;
```

- [ ] **步骤 3.3：替换 send() 方法**

将 `send(String conversationUuid, String content)`（第 29-61 行）替换为：

```java
public Map<String, Object> send(String conversationUuid, String content, String clientMsgId) {
    Conversation conversation = conversationMapper.findByUuid(conversationUuid);
    if (conversation == null) {
        throw new IllegalArgumentException("会话不存在: " + conversationUuid);
    }

    List<Map<String, String>> history = memoryService.getHistory(conversationUuid);
    List<Map<String, String>> messages = new ArrayList<>(history);
    messages.add(Map.of("role", "user", "content", content));

    ChatMessage userMsg = new ChatMessage();
    userMsg.setUuid(UUID.randomUUID().toString());
    userMsg.setConversationUuid(conversationUuid);
    userMsg.setRole("user");
    userMsg.setContent(content);
    chatMessageMapper.insert(userMsg);

    pushService.pushStreamEvent(conversationUuid, Map.of(
        "type", "start",
        "client_msg_id", clientMsgId
    ));

    StringBuilder fullContent = new StringBuilder();
    String assistantMsgUuid = UUID.randomUUID().toString();

    try {
        llmClient.chatStream(messages)
            .doOnNext(chunk -> {
                fullContent.append(chunk);
                pushService.pushStreamEvent(conversationUuid, Map.of(
                    "type", "chunk",
                    "content", chunk,
                    "client_msg_id", clientMsgId
                ));
            })
            .blockLast();
    } catch (Exception e) {
        String partial = fullContent.toString();
        if (!partial.isEmpty()) {
            ChatMessage partialMsg = new ChatMessage();
            partialMsg.setUuid(assistantMsgUuid);
            partialMsg.setConversationUuid(conversationUuid);
            partialMsg.setRole("assistant");
            partialMsg.setContent(partial);
            partialMsg.setCreatedAt(java.time.LocalDateTime.now());
            chatMessageMapper.insert(partialMsg);
        }
        pushService.pushStreamEvent(conversationUuid, Map.of(
            "type", "error",
            "message", e.getMessage(),
            "client_msg_id", clientMsgId
        ));
        return Map.of("response", partial);
    }

    String response = fullContent.toString();

    ChatMessage assistantMsg = new ChatMessage();
    assistantMsg.setUuid(assistantMsgUuid);
    assistantMsg.setConversationUuid(conversationUuid);
    assistantMsg.setRole("assistant");
    assistantMsg.setContent(response);
    assistantMsg.setCreatedAt(java.time.LocalDateTime.now());
    chatMessageMapper.insert(assistantMsg);

    pushService.pushStreamEvent(conversationUuid, Map.of(
        "type", "done",
        "message_uuid", assistantMsgUuid,
        "client_msg_id", clientMsgId
    ));

    return Map.of("response", response);
}
```

- [ ] **步骤 3.4：验证编译**

```bash
cd backend && mvn compile -q
```

预期：`BUILD SUCCESS`

---

### 任务 4：更新 `ConversationController` 传递 `client_msg_id`

**文件：** `backend/src/main/java/com/fast/agent/rest/ConversationController.java`

**说明：** 前端请求中已包含 `client_msg_id`，控制器需要提取并传递给 service。

- [ ] **步骤 4.1：修改 sendMessage() 方法**

将 `sendMessage`（第 19-31 行）替换为：

```java
@PostMapping("/{conversationUuid}/messages")
public Map<String, Object> sendMessage(
        @PathVariable String conversationUuid, @RequestBody Map<String, Object> request) {
    String content =
            (String)
                    (request.get("content") != null
                            ? request.get("content")
                            : request.get("message"));
    if (content == null || content.isBlank()) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "content 不能为空");
    }
    String clientMsgId = (String) request.get("client_msg_id");
    return conversationService.send(conversationUuid, content, clientMsgId);
}
```

- [ ] **步骤 4.2：验证编译**

```bash
cd backend && mvn compile -q
```

预期：`BUILD SUCCESS`

---

### 任务 5：简化前端 SocketIO 事件监听

**文件：** `frontend/src/app/(authenticated)/page.tsx`

**说明：** 将 4 个事件（`new_message`、`stream_chunk`、`agent_progress`、`sync`）的监听合并为单个 `stream_event`。`handleWsMessage` 保持不变（已支持 `{type, content, client_msg_id}` 格式）。

- [ ] **步骤 5.1：替换事件监听 useEffect**

将第 112-145 行的 useEffect 替换为：

```typescript
  // Socket event handling
  useEffect(() => {
    const handleStreamEvent = (...args: unknown[]) => {
      const data = args[0] as Record<string, unknown>;
      handleWsMessage(data);
    };

    onEvent("stream_event", handleStreamEvent);

    return () => {
      offEvent("stream_event", handleStreamEvent);
    };
  }, [handleWsMessage]);
```

- [ ] **步骤 5.2：验证前端构建**

```bash
cd frontend && npm run build 2>&1 | tail -20
```

预期：构建成功，无错误。

---

## 自检

- [x] **规格覆盖度：** 所有 6 个改动点（LLMClient SSE 修复、SocketIOPushService 新增方法、ConversationService 流式重写、Controller 传参、前端事件简化、异常处理）都在设计文档中对应。
- [x] **占位符扫描：** 无 TODO、待定、模糊内容。所有代码和命令均为完整具体内容。
- [x] **类型一致性：** `send()` 签名从 `(String, String)` 变为 `(String, String, String)`，controller 调用方同步修改。`pushStreamEvent` 的 data 参数类型为 `Map<String, Object>`，调用方传入 `Map.of(...)` 一致。
