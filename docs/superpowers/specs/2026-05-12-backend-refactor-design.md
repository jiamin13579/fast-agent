# 后端重构设计文档

## 背景

当前后端存在两个明显问题：
1. **包分层混乱** — Controller 散落在 6 个不同包中，不符合标准 Java 三层架构
2. **SQL 代码散落** — 所有 Mapper 都有 `@Select`/`@Insert` 等注解，未充分利用 MyBatis-Plus

## 目标架构

### 包结构

```
com.fast.agent
├── rest/              ← REST Controllers
├── ws/                ← WebSocket Handlers
├── service/            ← 业务编排层
│   ├── ConversationService.java
│   └── MemoryService.java
├── repository/        ← 所有 Mapper（继承 BaseMapper，无 SQL）
├── entity/             ← 所有 Entity
├── config/             ← 所有配置类
├── init/               ← 数据初始化
├── util/               ← 工具类
└── engine/             ← AI 执行引擎
    ├── LLMAgent.java   ← AI Agent 核心编排
    ├── LLMClient.java  ← HTTP 客户端调 AI
    └── tools/          ← 工具注册与执行
```

### 分层原则

| 层级 | 内容 | 说明 |
|---|---|---|
| `rest/` | 所有 `@RestController` | HTTP REST API |
| `ws/` | WebSocket `TextWebSocketHandler` | WebSocket 协议处理 |
| `service/` | 所有 `@Service` | 业务编排，协调 web 层和 engine 层 |
| `repository/` | 所有 Mapper | 继承 `BaseMapper<T>`，用 MP 内置方法，不写 SQL |
| `entity/` | 所有实体类 | `@Data` Lombok，无业务逻辑 |
| `config/` | 所有配置类 | SecurityConfig, JwtAuthFilter, MybatisConfig, WebSocketConfig |
| `engine/` | 运行时核心 | AI 执行引擎，与协议层分离 |

### 调用链

```
rest/ → service/ → repository/
              ↓
           engine/
```

- `rest/` 只调 `service/`
- `service/` 负责业务编排，调 `repository/` 查数据，调 `engine/` 做 AI 执行
- `engine/` 不被 web 层直接调用

### MyBatis-Plus 改造

**原则：** 所有 Mapper 继承 `BaseMapper<T>`，使用 MP 内置方法（`selectById`、`insert`、`update`、`deleteById` 等），完全消除手写 SQL。

### 表名统一

| Entity | 新表名 |
|---|---|
| User | `user` |
| Conversation | `conversation` |
| ChatMessage | `chat_message` |
| Log | `log` |

## 本次实施范围

### REST Controller

| 原路径 | 新路径 |
|---|---|
| `controller/AuthController.java` | `rest/AuthController.java` |
| `controller/AdminUserController.java` | `rest/AdminUserController.java` |
| `core/chat/ChatController.java` | `rest/ConversationController.java` |

### WebSocket 组件

| 原路径 | 新路径 |
|---|---|
| `core/chat/ChatWebSocketHandler.java` | `ws/ChatWebSocketHandler.java` |
| `core/chat/WebSocketConfig.java` | `config/WebSocketConfig.java` |

### Service

| 原路径 | 新路径 |
|---|---|
| `core/memory/MemoryService.java` | `service/MemoryService.java` |
| （新增） | `service/ConversationService.java` |

### Repository

| 原路径 | 新路径 |
|---|---|
| `repository/UserRepository.java` | `repository/UserMapper.java` |
| `dynamic/mapper/ChatMapper.java` | `repository/ConversationMapper.java` |
| `dynamic/mapper/MessageMapper.java` | `repository/ChatMessageMapper.java` |
| `dynamic/mapper/LogMapper.java` | `repository/LogMapper.java` |

### Entity

| 原路径 | 新路径 | 备注 |
|---|---|---|
| `entity/User.java` | `entity/User.java` | |
| `entity/Role.java` | `entity/Role.java` | |
| `dynamic/entity/Chat.java` | `entity/Conversation.java` | |
| `dynamic/entity/Message.java` | `entity/ChatMessage.java` | |
| `dynamic/entity/Log.java` | `entity/Log.java` | |

### Engine 运行时组件

| 原路径 | 新路径 |
|---|---|
| `core/agent/LlmAgent.java` | `engine/LLMAgent.java` |
| `adapter/LlmAdapter.java` | `engine/LLMClient.java` |
| `core/tool/ToolRegistry.java` | `engine/tools/ToolRegistry.java` |
| `core/tool/ToolDefinition.java` | `engine/tools/ToolDefinition.java` |
| `core/tool/McpTool.java` | `engine/tools/McpTool.java` |
| `core/tool/Param.java` | `engine/tools/Param.java` |
| `core/tool/ParamDefinition.java` | `engine/tools/ParamDefinition.java` |
| `core/tool/Tool.java` | `engine/tools/Tool.java` |

### 其他（不变）

| 路径 | 说明 |
|---|---|
| `config/SecurityConfig.java` | 配置类 |
| `config/JwtAuthenticationFilter.java` | Filter |
| `config/MybatisConfig.java` | 配置类 |
| `init/DataInitializer.java` | 数据初始化 |
| `util/JwtUtil.java` | JWT 工具类 |
| `adapter/LlmResponse.java` | 移到 `engine/LLMResponse.java` |

## 包名变更

`com.agent.*` → `com.fast.agent.*`

## 实施步骤

1. **创建新包结构** (`com.fast.agent.*`)
2. **迁移所有 Entity** — 添加 `@TableName` 注解指向新表名，重命名 Chat→Conversation、Message→ChatMessage
3. **改造所有 Mapper** — 继承 `BaseMapper<T>`，删除所有 SQL 注解
4. **迁移 REST Controller** — 统一到 `rest/`，ChatController → ConversationController
5. **迁移 WebSocket** — `ws/ChatWebSocketHandler`、`config/WebSocketConfig`
6. **迁移并新建 Service** — MemoryService 移入 `service/`，新建 `ConversationService`
7. **迁移 Engine 组件** — 统一到 `engine/`
8. **更新所有 import 语句**
9. **更新 Spring Boot 启动类包名** (`com.fast.agent`)

## 阶段 2 进展（2026-05-13）

1. 已切换到 MyBatis-Plus starter，并完成 mapper 全量 `BaseMapper<T>` 化（无注解 SQL）。
2. 已新增 `V2__phase2_normalize_tables.sql`，支持旧表重命名到 `user/conversation/chat_message/...`，并将 `chat_message.chat_id` 迁移为 `conversation_id`。
3. REST 路径已统一为 `/api/conversation/*`，旧路径 `/api/chat/*` 已移除。
4. 请求字段统一为 `conversation_id`/`conversationId`，旧字段 `chat_id`/`chatId` 已移除兼容。
5. 创建会话响应默认输出 `id + conversation_id`，不再继续扩散 `chat_id` 新输出。
6. 前端调用已切换到 `/api/conversation/*` 与 `conversation_id`。
7. 对旧路径请求返回 `404`，对旧字段请求返回 `400`，避免隐式兼容导致行为漂移。
