# SocketIO 切换设计

Date: 2026-05-14
Status: draft

## 背景

当前使用原生 Spring WebSocket（`/ws/conversation`）进行通信，主要支持客户端发送消息、服务端流式响应的请求-响应模式。

新需求需要支持**服务端主动推送**场景：
1. Agent 执行进度通知
2. 后台任务完成通知
3. 多端同步（同一账号其他设备操作后同步）

切换到 SocketIO 以获得：
- Rooms 隔离（多 conversation 消息分发）
- 自动重连和心跳机制
- 更稳定的长连接体验

## 技术选型

- **后端**：Spring Boot + Netty-socketIO（内嵌到现有 Spring Boot）
- **前端**：socket.io-client（React/Next.js）
- **协议**：SocketIO 替代原生 WebSocket

## 架构设计

### Endpoint 结构

```
SocketIO Server: ws://localhost:8080
Namespace: / (根命名空间，全 APP 统一接入)
Rooms:
  ├── conversation:{uuid}  → 特定会话的消息
  ├── agent:{uuid}         → 特定会话的 Agent 进度
  └── global:notifications → 全局通知广播
```

### 消息流向

```
客户端连接 → Namespace / (根)
                ↓
            加入 Room (conversation:xxx, agent:xxx, global:notifications)
                ↓
服务端推送 → 通过 Room 分发到对应客户端
```

### 认证

- 连接时通过 query 参数传递 token 进行认证
- 认证失败断开连接
- 与现有认证方式兼容

## 接口设计

### 架构：HTTP REST + SocketIO 混合

```
HTTP REST → 请求-响应类操作（发送消息、管理会话）
SocketIO  → Room 管理 + 服务端主动推送
```

### HTTP REST API

#### 1. 发送消息
```
POST /api/conversation/{conversation_uuid}/messages
Body: { "content": "用户输入", "client_msg_id": "可选" }
Response: { "message_uuid": "...", "status": "queued" }
```

#### 2. 获取历史
```
GET /api/conversation/{conversation_uuid}/messages
Response: { "messages": [...] }
```

#### 3. 列举会话
```
GET /api/conversations
Response: { "conversations": [...] }
```

#### 4. 创建会话
```
POST /api/conversations
Body: { "name": "会话名称（可选）" }
Response: { "uuid": "...", "name": "..." }
```

#### 5. 删除会话
```
DELETE /api/conversation/{conversation_uuid}
Response: { "success": true }
```

#### 6. 重命名会话
```
PATCH /api/conversation/{conversation_uuid}
Body: { "name": "新名称" }
Response: { "success": true, "name": "..." }
```

### SocketIO：连接与 Room 管理

#### 1. 加入 Room
```json
{
  "action": "join",
  "room": "conversation:{uuid}"
}
```
客户端加入特定会话的 Room，接收该会话的实时消息推送。

#### 2. 加入 Agent Room
```json
{
  "action": "join",
  "room": "agent:{uuid}"
}
```
客户端加入特定会话的 Agent 进度 Room，接收 Agent 执行进度。

#### 3. 订阅全局通知
```json
{
  "action": "join",
  "room": "global:notifications"
}
```

#### 4. 离开 Room
```json
{
  "action": "leave",
  "room": "conversation:{uuid}"
}
```

### 服务端 → 客户端（SocketIO 推送）

#### 1. 新消息通知
推送到 Room `conversation:{uuid}`：
```json
{
  "event": "new_message",
  "room": "conversation:{uuid}",
  "data": {
    "message_uuid": "...",
    "role": "user|assistant",
    "content": "...",
    "timestamp": "..."
  }
}
```

#### 2. 消息已发送确认
推送到 Room `conversation:{uuid}`：
```json
{
  "event": "message_sent",
  "room": "conversation:{uuid}",
  "data": {
    "client_msg_id": "客户端消息ID",
    "message_uuid": "服务端生成的UUID"
  }
}
```

#### 3. 流式响应（仍然通过 SocketIO）
```json
{
  "event": "stream_start",
  "room": "conversation:{uuid}",
  "data": { "message_uuid": "..." }
}
```
```json
{
  "event": "stream_chunk",
  "room": "conversation:{uuid}",
  "data": { "message_uuid": "...", "content": "..." }
}
```
```json
{
  "event": "stream_done",
  "room": "conversation:{uuid}",
  "data": { "message_uuid": "...", "full_content": "..." }
}
```

## 服务端主动推送事件

所有事件通过根 Namespace `/` 推送，客户端通过加入对应 Room 接收。

### 1. Agent 进度推送
推送到 Room `agent:{uuid}`：
```json
{
  "event": "agent_progress",
  "room": "agent:{uuid}",
  "data": {
    "conversation_uuid": "uuid-string",
    "stage": "thinking|executing|completed",
    "message": "进度描述",
    "progress": 0-100
  }
}
```

### 2. 任务完成通知
推送到 Room `conversation:{uuid}`：
```json
{
  "event": "task_completed",
  "room": "conversation:{uuid}",
  "data": {
    "conversation_uuid": "uuid-string",
    "task_id": "任务ID",
    "result": "任务结果摘要"
  }
}
```

### 3. 多端同步通知
推送到 Room `conversation:{uuid}` 和 `global:notifications`：
```json
{
  "event": "sync",
  "room": "conversation:{uuid}",
  "data": {
    "action": "create|rename|delete",
    "conversation": {"uuid": "...", "name": "..."}
  }
}
```

## 前端改造

### 依赖
```bash
npm install socket.io-client
```

### 连接与 Room 管理
```typescript
import { io } from "socket.io-client";

const socket = io("/", {
  transports: ["websocket"],
  auth: { token: getToken() }
});

// 加入 Room 接收推送
socket.emit("join", { room: "conversation:xxx" });
socket.emit("join", { room: "agent:xxx" });

// 监听服务端推送
socket.on("new_message", (data) => {...});
socket.on("stream_chunk", (data) => {...});
socket.on("agent_progress", (data) => {...});
socket.on("task_completed", (data) => {...});
socket.on("sync", (data) => {...});
```

### HTTP 请求示例
```typescript
// 发送消息
const res = await fetch(`/api/conversation/${uuid}/messages`, {
  method: "POST",
  body: JSON.stringify({ content: "hello" })
});

// 获取历史
const history = await fetch(`/api/conversation/${uuid}/messages`).then(r => r.json());

// 列举会话
const convs = await fetch("/api/conversations").then(r => r.json());
```

## 后端改造

### 依赖
```xml
<dependency>
    <groupId>com.github</groupId>
    <artifactId>netty-socketio</artifactId>
    <version>1.7.22</version>
</dependency>
```

### 架构
```
HTTP REST Controllers → ConversationService → 数据库
        ↓
SocketIOServer → Room 管理 + 主动推送
```

### SocketIO 配置
```java
@Configuration
public class SocketIOConfig {
    @Bean
    public SocketIOServer socketIOServer() {
        Configuration config = new Configuration();
        config.setPort(8080);
        // ... 设置认证、心跳等
        SocketIOServer server = new SocketIOServer(config);
        // 使用根 Namespace，全 APP 统一接入
        server.addNamespace("/");
        return server;
    }
}
```

### 事件处理
- 服务端主动推送通过 `server.getNamespace("/").getRoomOperations(room).sendEvent()` 实现
- 消息路由与现有 ConversationService 集成

### 推送触发点
当 HTTP 请求完成（发送消息、创建会话等）后，触发 SocketIO 推送：
1. `POST /api/conversation/{id}/messages` → 触发 `new_message` 推送到 `conversation:{id}`
2. Agent 执行中 → 触发 `agent_progress` 推送到 `agent:{id}`
3. 会话操作 → 触发 `sync` 推送到 `conversation:{id}` 和 `global:notifications`

## 实现计划

### Phase 1: 基础建设
1. 添加 Netty-socketIO 依赖
2. 配置 SocketIO Server（根 Namespace `/`）
3. 实现 Room join/leave 管理
4. 前端集成 socket.io-client

### Phase 2: HTTP REST API
1. 实现 `/api/conversations` CRUD 接口
2. 实现 `/api/conversation/{uuid}/messages` 接口
3. 消息发送后触发 SocketIO 推送

### Phase 3: 实时推送
1. 实现 `new_message` 事件推送
2. 实现 `agent_progress` 事件推送
3. 实现 `sync` 事件推送（多端同步）
4. 实现 `task_completed` 事件推送

### Phase 4: 流式响应
1. 流式响应通过 SocketIO 推送 chunks
2. 实现 `stream_start` / `stream_chunk` / `stream_done` 事件

## 兼容性

- WebSocket 端点 `/ws/conversation` 暂时保留，切换完成后可考虑移除
- 渐进式切换，先实现基础连接，再逐步迁移 HTTP 和推送功能

## 风险与应对

1. **性能**：SocketIO 相比原生 WebSocket 有一定协议开销，流式响应性能略低
   - 应对：流式场景使用 SocketIO 的 WebSocket 传输，开销可控
2. **依赖增加**：引入 Netty-socketIO 依赖
   - 应对：内嵌运行，无需额外服务
3. **学习成本**：团队对 SocketIO 不熟悉
   - 应对：API 简洁，文档完善，上手快