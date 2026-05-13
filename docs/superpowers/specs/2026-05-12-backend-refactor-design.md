# 后端重构设计文档

## 背景

当前后端存在两个明显问题：

1. **包分层混乱**：Controller、Service、Mapper、运行时组件散落在 `controller/`、`core/*/`、`dynamic/*/`、`adapter/`、`repository/` 等多个包中，边界不清晰。
2. **数据访问方式不统一**：`repository/UserRepository` 与 `dynamic/mapper/*Mapper` 并存，Mapper 中存在大量注解 SQL，后续维护和迁移成本较高。

本次重构必须优先保证现有登录、用户管理、聊天、WebSocket、MCP、RAG、Skill、Task 等功能可用。包结构调整和数据库表名调整不得在同一期内混做。

## 审计结论

原始方案存在以下落地风险，本版 spec 已将其转为实施约束：

1. 实施范围不能只覆盖 Chat/Auth/User/Log；当前后端还包含 `core/mcp`、`core/rag`、`core/skill`、`core/task`、`mcp` 等模块。
2. 当前 `pom.xml` 只有 MyBatis Starter，没有 MyBatis-Plus Starter；不能在未补依赖和配置的情况下要求 Mapper 继承 `BaseMapper<T>`。
3. 当前数据库表为 `t_user`、`agent_chat`、`agent_message`、`agent_log` 等；直接改成 `user`、`conversation`、`chat_message`、`log` 会破坏现有数据访问。
4. `findByEmail`、`findByChatId`、`deleteByChatId`、按时间排序的 `findAll` 等不是 `BaseMapper` 直接等价能力，迁移时必须用 `LambdaQueryWrapper`/`LambdaUpdateWrapper` 明确保留语义。
5. WebSocket 当前通过 `new ChatWebSocketHandler()` 注册，可能绕过 Spring 注入；迁移时必须修正为 Bean 注入。

## 分期策略

### 一期：包结构与服务边界重构

目标：统一 Java 包结构，抽出业务 Service，保持数据库表名、REST 路径、JSON 字段和前端契约兼容。

一期不做：

- 不改数据库表名。
- 不改 `/api/chat/*`、`/api/auth/*`、`/api/admin/*` 等现有接口路径。
- 不把所有 Mapper 强制改成 MyBatis-Plus。
- 不删除现有业务语义相同但命名不同的请求字段兼容，例如 `chat_id` 与 `chatId`。
- 不新增 H2/Testcontainers 测试基建。

### 二期：MyBatis-Plus 与表名规范化

目标：在一期稳定后，引入 MyBatis-Plus，逐步移除注解 SQL，并通过 Flyway 或等价迁移机制完成表名/字段名规范化。

二期开始前必须满足：

- 一期所有回归验证通过。
- 明确是否保留历史数据。
- 提供数据库迁移脚本、回滚脚本或兼容视图方案。
- 提供前端/API 兼容窗口和废弃策略。

## 目标架构

### 包结构

```text
com.fast.agent
├── rest/               # REST Controllers
├── ws/                 # WebSocket Handlers
├── service/            # 业务编排层
├── repository/         # Mapper/Repository
├── entity/             # Entity
├── config/             # 配置类
├── init/               # 数据初始化
├── util/               # 工具类
├── engine/             # AI 执行引擎
│   └── tools/          # 工具注册与执行
└── mcp/                # MCP 协议网关与 DTO
```

### 分层原则

| 层级 | 内容 | 说明 |
|---|---|---|
| `rest/` | 所有 `@RestController` | HTTP REST API，负责参数接收和响应组装 |
| `ws/` | WebSocket Handler | WebSocket 协议处理，必须由 Spring 管理 |
| `service/` | 所有 `@Service` | 业务编排，协调 repository、engine、mcp 等组件 |
| `repository/` | Mapper/Repository | 一期保留 MyBatis 注解 SQL；二期再迁移到 MyBatis-Plus |
| `entity/` | 所有实体类 | 数据实体，不放业务编排逻辑 |
| `config/` | 配置类 | Security、JWT Filter、MyBatis、WebSocket 等配置 |
| `engine/` | AI 运行时核心 | LLM 调用、Agent 编排、工具注册与执行 |
| `mcp/` | MCP 协议组件 | MCP Gateway、Request、Response |

### 调用链

```text
rest/ → service/ → repository/
              ↓
           engine/
              ↓
            mcp/

ws/   → service/ → repository/
              ↓
           engine/
```

约束：

- `rest/` 和 `ws/` 不直接调用 Mapper。
- `rest/` 和 `ws/` 不直接调用 `engine/`，统一通过 Service 编排。
- `engine/` 不依赖 `rest/` 或 `ws/`。
- `repository/` 不依赖 `service/`、`rest/`、`ws/`、`engine/`。

## 一期实施范围

### REST Controller

| 原路径 | 新路径 | 兼容要求 |
|---|---|---|
| `controller/AuthController.java` | `rest/AuthController.java` | 保持 `/api/auth/*` 路径不变 |
| `controller/AdminUserController.java` | `rest/AdminUserController.java` | 保持现有管理端路径不变 |
| `core/chat/ChatController.java` | `rest/ConversationController.java` | 一期路径保持 `/api/chat/*`，二期切换到 `/api/conversation/*` |
| `core/mcp/McpController.java` | `rest/McpController.java` | 保持现有路径不变 |
| `core/rag/KnowledgeController.java` | `rest/KnowledgeController.java` | 保持现有路径不变 |
| `core/skill/SkillController.java` | `rest/SkillController.java` | 保持现有路径不变 |
| `core/task/TaskController.java` | `rest/TaskController.java` | 保持现有路径不变 |

### WebSocket 组件

| 原路径 | 新路径 | 要求 |
|---|---|---|
| `core/chat/ChatWebSocketHandler.java` | `ws/ChatWebSocketHandler.java` | 使用构造器注入依赖 |
| `core/chat/WebSocketConfig.java` | `config/WebSocketConfig.java` | 注册 Spring 管理的 Handler Bean |

### Service

| 原路径 | 新路径 | 要求 |
|---|---|---|
| `service/AuthService.java` | `service/AuthService.java` | 更新包名和 Mapper 依赖 |
| `service/UserService.java` | `service/UserService.java` | 更新包名和 Mapper 依赖 |
| `core/memory/MemoryService.java` | `service/MemoryService.java` | 保持聊天历史语义不变 |
| `core/rag/RagService.java` | `service/RagService.java` | 保持知识库接口语义不变 |
| `core/skill/SkillService.java` | `service/SkillService.java` | 保持 Skill 加载语义不变 |
| `core/task/TaskExecutionManager.java` | `service/TaskExecutionManager.java` | 保持任务执行语义不变 |
| `core/task/TaskExecutionRunner.java` | `service/TaskExecutionRunner.java` | 保持任务执行语义不变 |
| （新增） | `service/ConversationService.java` | 承接原 ChatController 中的会话、消息、LLM 编排逻辑 |

### Repository

一期只做包路径统一，保留现有 SQL 注解和方法语义。

| 原路径 | 新路径 | 一期要求 |
|---|---|---|
| `repository/UserRepository.java` | `repository/UserMapper.java` | 保留 `findByEmail`、`findAll` 等方法 |
| `dynamic/mapper/ChatMapper.java` | `repository/ConversationMapper.java` | 仍访问 `agent_chat` |
| `dynamic/mapper/MessageMapper.java` | `repository/ChatMessageMapper.java` | 仍访问 `agent_message`，保留 `findByChatId`、`deleteByChatId` |
| `dynamic/mapper/LogMapper.java` | `repository/LogMapper.java` | 仍访问 `agent_log` |
| `dynamic/mapper/KnowledgeSourceMapper.java` | `repository/KnowledgeSourceMapper.java` | 仍访问 `agent_knowledge_source` |
| `dynamic/mapper/McpServerMapper.java` | `repository/McpServerMapper.java` | 仍访问 `agent_mcp_server` |
| `dynamic/mapper/ScheduledTaskMapper.java` | `repository/ScheduledTaskMapper.java` | 仍访问 `agent_scheduled_task` |
| `dynamic/mapper/SkillMapper.java` | `repository/SkillMapper.java` | 仍访问 `agent_skill` |
| `dynamic/mapper/TaskMapper.java` | `repository/TaskMapper.java` | 仍访问 `agent_task` |

### Entity

一期可以改 Java 类名，但 `@TableName` 或 SQL 必须继续指向现有表。

| 原路径 | 新路径 | 一期表名 |
|---|---|---|
| `entity/User.java` | `entity/User.java` | `t_user` |
| `entity/Role.java` | `entity/Role.java` | 无表 |
| `dynamic/entity/Chat.java` | `entity/Conversation.java` | `agent_chat` |
| `dynamic/entity/Message.java` | `entity/ChatMessage.java` | `agent_message` |
| `dynamic/entity/Log.java` | `entity/Log.java` | `agent_log` |
| `dynamic/entity/KnowledgeSource.java` | `entity/KnowledgeSource.java` | `agent_knowledge_source` |
| `dynamic/entity/McpServer.java` | `entity/McpServer.java` | `agent_mcp_server` |
| `dynamic/entity/ScheduledTask.java` | `entity/ScheduledTask.java` | `agent_scheduled_task` |
| `dynamic/entity/Skill.java` | `entity/Skill.java` | `agent_skill` |
| `dynamic/entity/Task.java` | `entity/Task.java` | `agent_task` |

### Engine 与 MCP 组件

| 原路径 | 新路径 |
|---|---|
| `core/agent/LlmAgent.java` | `engine/LLMAgent.java` |
| `adapter/LlmAdapter.java` | `engine/LLMClient.java` |
| `adapter/LlmResponse.java` | `engine/LLMResponse.java` |
| `core/tool/ToolRegistry.java` | `engine/tools/ToolRegistry.java` |
| `core/tool/ToolDefinition.java` | `engine/tools/ToolDefinition.java` |
| `core/tool/McpTool.java` | `engine/tools/McpTool.java` |
| `core/tool/Param.java` | `engine/tools/Param.java` |
| `core/tool/ParamDefinition.java` | `engine/tools/ParamDefinition.java` |
| `core/tool/Tool.java` | `engine/tools/Tool.java` |
| `mcp/McpGateway.java` | `mcp/McpGateway.java` |
| `mcp/McpRequest.java` | `mcp/McpRequest.java` |
| `mcp/McpResponse.java` | `mcp/McpResponse.java` |

### 配置与启动类

| 原路径 | 新路径 | 要求 |
|---|---|---|
| `AgentApplication.java` | `AgentApplication.java` | 包名改为 `com.fast.agent`，`scanBasePackages` 指向 `com.fast.agent` |
| `config/SecurityConfig.java` | `config/SecurityConfig.java` | 保持认证规则兼容 |
| `config/JwtAuthenticationFilter.java` | `config/JwtAuthenticationFilter.java` | 保持 JWT 解析逻辑兼容 |
| `config/MybatisConfig.java` | `config/MybatisConfig.java` | MapperScan 改为 `com.fast.agent.repository` |
| `init/DataInitializer.java` | `init/DataInitializer.java` | 保持初始化用户逻辑兼容 |
| `util/JwtUtil.java` | `util/JwtUtil.java` | 保持 Token 结构兼容 |

## 二期实施范围

### MyBatis-Plus 改造

二期要求：

1. 在 `pom.xml` 引入 MyBatis-Plus Spring Boot Starter，并移除或兼容原 MyBatis Starter 配置。
2. 所有 Mapper 继承 `BaseMapper<T>`。
3. 删除注解 SQL 前，先在 Service 中用 `LambdaQueryWrapper`/`LambdaUpdateWrapper` 覆盖自定义查询。
4. 必须保留以下语义：
   - `UserMapper.findByEmail(email)` 等价查询。
   - 会话列表按 `created_at DESC`。
   - 消息历史按 `created_at ASC`。
   - 删除会话前删除该会话下全部消息。
   - 任务、Skill、MCP、知识源的 `enabled = true` 查询和排序语义。

### 表名统一

二期目标表名：

| Entity | 现表名 | 目标表名 |
|---|---|---|
| User | `t_user` | `user` |
| Conversation | `agent_chat` | `conversation` |
| ChatMessage | `agent_message` | `chat_message` |
| Log | `agent_log` | `log` |
| Skill | `agent_skill` | `skill` |
| McpServer | `agent_mcp_server` | `mcp_server` |
| ScheduledTask | `agent_scheduled_task` | `scheduled_task` |
| KnowledgeSource | `agent_knowledge_source` | `knowledge_source` |
| Task | `agent_task` | `task` |

注意：

- MySQL 中 `user`、`log`、`task` 等名称可能引发可读性或保留字/系统表混淆；实施前必须确认目标数据库兼容性并完成 SQL 校验。
- 表名迁移必须通过版本化 SQL 脚本完成，不允许只改 Entity 注解。
- 二期将字段从 `chat_id` 迁移到 `conversation_id`，并提供兼容窗口：迁移期同时兼容 `chat_id`/`chatId` 输入，完成前端切换后再删除旧字段兼容。

## 包名变更

一期统一从：

```text
com.agent.*
```

迁移到：

```text
com.fast.agent.*
```

要求：

- Java 文件路径必须与 package 声明一致。
- `pom.xml` 的 `groupId` 是否从 `com.agent` 改为 `com.fast.agent` 需要单独确认；若只影响构建坐标，可放在一期末尾做。
- 所有配置中的扫描路径必须同步更新。

## 兼容性要求

一期必须保持：

- 登录接口 `/api/auth/login` 可用。
- 当前 JWT claim 结构可用。
- 管理员用户初始化逻辑可用。
- 聊天接口 `/api/chat/create`、`/api/chat/list`、`/api/chat/send`、`/api/chat/history/{chatId}`、`/api/chat/delete/{chatId}` 可用。
- 请求字段 `chat_id` 与 `chatId` 继续兼容。
- WebSocket `/ws/chat` 可连接并能发送聊天消息。
- 现有数据库表和数据无需迁移即可运行。

二期兼容切换要求：

- REST 路径切换为 `/api/conversation/*`，并保留 `/api/chat/*` 兼容别名至少一个发布周期。
- 请求字段统一为 `conversation_id`，迁移窗口内兼容 `chat_id`/`chatId`，窗口结束后移除旧字段输入。

## 实施步骤

### 一期步骤

1. 创建 `com.fast.agent` 目标包结构。
2. 迁移 Entity 到 `entity/`，保留现有表映射或现有 SQL 表名。
3. 迁移 Mapper 到 `repository/`，保留现有注解 SQL 和方法签名语义。
4. 抽取 `ConversationService`，将 `ChatController` 中的会话、消息、LLM 编排逻辑下沉。
5. 迁移 REST Controller 到 `rest/`，保持外部 API 路径兼容。
6. 迁移 WebSocket 到 `ws/`，修正 Handler Bean 注入方式。
7. 迁移 Engine 组件到 `engine/` 和 `engine/tools/`。
8. 迁移 MCP DTO/Gateway 到 `com.fast.agent.mcp`。
9. 更新所有 import、`scanBasePackages`、`@MapperScan`、配置包名。
10. 运行格式化、编译和接口回归验证。

### 二期步骤

1. 引入 MyBatis-Plus 依赖和配置。
2. 为每个 Entity 增加明确的 `@TableName`、主键策略和字段映射。
3. 将 Mapper 改为继承 `BaseMapper<T>`。
4. 将自定义查询迁移到 Service 层 Wrapper 查询。
5. 增加 Mapper/Service 回归测试。
6. 编写数据库表名迁移脚本。
7. 在测试库验证迁移、回滚和数据一致性。
8. 更新 Entity 表名到目标表。
9. 完成全量接口回归。

## 验收标准

一期验收：

- `mvn test` 或至少 `mvn -DskipTests package` 通过。
- Spring Boot 应用可以启动。
- 登录接口返回 Token。
- `/api/auth/me` 可通过 Token 获取当前用户。
- 可以创建会话、发送消息、查询历史、删除会话。
- WebSocket `/ws/chat` 使用 Spring Bean Handler，不出现依赖为空。
- MCP、Knowledge、Skill、Task 相关 Controller Bean 正常注册。
- 代码中不再出现 `package com.agent`。
- 代码中不再出现旧的 `com.agent.*` import。

二期验收：

- MyBatis-Plus 依赖和 Mapper 扫描配置生效。
- 所有 Mapper 注解 SQL 已移除或有明确保留理由。
- 自定义查询语义有 Service 测试覆盖。
- 数据库迁移脚本可在空库和含旧数据的库上执行。
- 迁移后核心接口回归通过。

## 测试清单

最低回归命令：

```bash
cd backend
mvn -DskipTests package
```

建议补充自动化测试：

- `AuthService`：登录成功、密码错误、禁用账号。
- `ConversationService`：创建会话、发送消息、查询历史、删除会话。
- `MemoryService`：历史消息顺序为 `created_at ASC`。
- `UserService`：重置密码后 `mustChangePassword = true`。
- Mapper 查询：`findByEmail`、`findByChatId`、`deleteByChatId`、`findEnabled` 类查询保持原语义。

建议手工接口回归：

```bash
POST /api/auth/login
GET  /api/auth/me
POST /api/chat/create
GET  /api/chat/list
POST /api/chat/send
GET  /api/chat/history/{chatId}
DELETE /api/chat/delete/{chatId}
```

二期切换后手工回归：

```bash
POST /api/conversation/create
GET  /api/conversation/list
POST /api/conversation/send
GET  /api/conversation/history/{conversationId}
DELETE /api/conversation/delete/{conversationId}
```

## 回滚策略

一期回滚：

- 只涉及 Java 包结构和代码组织，不涉及数据库变更。
- 若启动失败，可回滚 Java 代码，不需要处理数据库。

二期回滚：

- 每个数据库迁移脚本必须有对应回滚说明。
- 表重命名前必须备份旧表。
- 若采用兼容视图或双写策略，必须说明关闭时机。

## 已决议项

1. 二期用户表目标名：`user`。
2. 二期消息关联字段：从 `chat_id` 迁移为 `conversation_id`。
3. 二期 REST 路径：切换为 `/api/conversation/*`，并对 `/api/chat/*` 提供过渡兼容。
4. 一期测试策略：不新增 H2/Testcontainers，只执行编译和现有回归验收。
