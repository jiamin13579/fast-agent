# Backend Refactor Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成一期后端重构：统一到 `com.fast.agent` 包结构并下沉业务编排到 Service，保持数据库与 API 兼容。

**Architecture:** 先做包名与启动扫描改造，再做 repository/entity 迁移，随后引入 `ConversationService` 承接 Chat 编排逻辑，最后迁移 rest/ws/engine/mcp 并回归验证。整个一期不改表名、不改接口路径、不改请求字段兼容行为。

**Tech Stack:** Spring Boot 3.2.x, Java 17, MyBatis (annotation SQL), Maven

---

## Scope

- In Scope: 一期要求的包结构迁移、依赖注入修复、服务边界重构、编译和接口回归。
- Out of Scope: MyBatis-Plus 引入、表名改造、数据库迁移脚本。

---

## File Map

- Modify: `backend/src/main/java/com/agent/AgentApplication.java`
- Modify: `backend/src/main/java/com/agent/config/MybatisConfig.java`
- Modify: `backend/src/main/java/com/agent/core/chat/WebSocketConfig.java`
- Modify: `backend/src/main/java/com/agent/core/chat/ChatController.java`
- Modify: `backend/src/main/java/com/agent/core/chat/ChatWebSocketHandler.java`
- Modify: `backend/pom.xml` (only if package/groupId decision is included in phase 1)
- Create/Move: all Java source files from `com.agent.*` to `com.fast.agent.*` tree
- Create: `backend/src/main/java/com/fast/agent/service/ConversationService.java`

---

### Task 1: 建立 `com.fast.agent` 包骨架与启动扫描

- [ ] **Step 1: 迁移启动类 package 到 `com.fast.agent`**
  - 文件：`backend/src/main/java/com/fast/agent/AgentApplication.java`
  - 修改点：`package` 声明、`scanBasePackages`、`@MapperScan` 目标包。

- [ ] **Step 2: 迁移配置类 package 并统一扫描路径**
  - 文件：`backend/src/main/java/com/fast/agent/config/MybatisConfig.java`
  - 修改点：`@MapperScan("com.fast.agent.repository")`，`typeAliasesPackage` 更新到新包。

- [ ] **Step 3: 全局替换 import 到 `com.fast.agent.*`**
  - 命令：`rg -n "import com\\.agent\\." backend/src/main/java`
  - 预期：仅剩待迁移文件，完成后为 0 行。

- [ ] **Step 4: 编译校验**
  - 命令：`cd backend && mvn -DskipTests compile`
  - 预期：编译通过，无 package/import 找不到错误。

---

### Task 2: 迁移 Entity 与 Repository（保持 SQL 与表名不变）

- [ ] **Step 1: 迁移 entity 到 `com.fast.agent.entity`**
  - 包含：`User`、`Role`、`Chat/Conversation`、`Message/ChatMessage`、`Log`、`KnowledgeSource`、`McpServer`、`ScheduledTask`、`Skill`、`Task`。
  - 要求：一期可改类名，但映射表名继续指向现有表（`t_user`、`agent_*`）。

- [ ] **Step 2: 迁移 mapper/repository 到 `com.fast.agent.repository`**
  - 包含：`UserRepository`（或改名 `UserMapper`）、`Chat/Message/Log/Task/Skill/McpServer/KnowledgeSource/ScheduledTask` 对应 mapper。
  - 要求：保留注解 SQL 和方法签名语义（`findByEmail`、`findByChatId`、`deleteByChatId`、排序）。

- [ ] **Step 3: 修复 service/controller 对 repository 的引用**
  - 命令：`rg -n "com\\.agent\\.(repository|dynamic\\.mapper|dynamic\\.entity)" backend/src/main/java`
  - 预期：迁移后该查询无残留或仅剩过渡兼容类。

- [ ] **Step 4: 编译校验**
  - 命令：`cd backend && mvn -DskipTests compile`
  - 预期：编译通过。

---

### Task 3: 新增 `ConversationService` 并下沉聊天编排

- [ ] **Step 1: 新建 `ConversationService`**
  - 文件：`backend/src/main/java/com/fast/agent/service/ConversationService.java`
  - 职责：
    - `createConversation`
    - `listConversations`
    - `sendMessage`
    - `getHistory`
    - `editMessage`
    - `recallMessage`
    - `deleteConversation`
  - 依赖：`LLMAgent`、`MemoryService`、`ConversationMapper`、`ChatMessageMapper`。

- [ ] **Step 2: `ChatController` 仅保留请求参数和响应组装**
  - 文件：`backend/src/main/java/com/fast/agent/rest/ConversationController.java`
  - 要求：保持现有接口路径 `/api/chat/*` 与字段兼容（`chat_id` 与 `chatId`）。

- [ ] **Step 3: 兼容行为回归**
  - 用例：编辑/撤回仅允许最后一条用户消息；删除会话先删消息。
  - 要求：行为与当前实现一致，不改变错误提示语义级别。

- [ ] **Step 4: 编译校验**
  - 命令：`cd backend && mvn -DskipTests compile`
  - 预期：编译通过。

---

### Task 4: 迁移 REST 控制器到 `rest/`

- [ ] **Step 1: 迁移控制器**
  - 目标：
    - `AuthController`
    - `AdminUserController`
    - `ConversationController`（原 `ChatController`）
    - `McpController`
    - `KnowledgeController`
    - `SkillController`
    - `TaskController`

- [ ] **Step 2: 检查 `@RequestMapping` 与 HTTP 方法注解**
  - 命令：`rg -n "@RequestMapping|@GetMapping|@PostMapping|@PutMapping|@DeleteMapping" backend/src/main/java/com/fast/agent/rest`
  - 预期：路径与重构前保持一致。

- [ ] **Step 3: 启动类扫描覆盖验证**
  - 预期：所有 Controller Bean 注册成功，无重复映射、无缺失映射。

---

### Task 5: 迁移 WebSocket 到 `ws/` 并修复注入

- [ ] **Step 1: 迁移 `ChatWebSocketHandler` 到 `com.fast.agent.ws`**
  - 要求：使用构造器注入，不使用字段注入。

- [ ] **Step 2: 修改 `WebSocketConfig` 使用 Spring 管理的 Handler Bean**
  - 禁止：`new ChatWebSocketHandler()`
  - 允许：通过构造器注入 `ChatWebSocketHandler`，在 `registerWebSocketHandlers` 中注册。

- [ ] **Step 3: 兼容路径验证**
  - 要求：仍注册在 `/ws/chat`。

- [ ] **Step 4: 编译校验**
  - 命令：`cd backend && mvn -DskipTests compile`
  - 预期：编译通过。

---

### Task 6: 迁移 Engine 与 MCP 组件

- [ ] **Step 1: 迁移 `LlmAgent/LlmAdapter/LlmResponse` 到 `engine`**
  - 新命名：`LLMAgent`、`LLMClient`、`LLMResponse`（按 spec）。
  - 要求：现有调用链行为不变。

- [ ] **Step 2: 迁移 `core/tool/*` 到 `engine/tools`**
  - 要求：Tool Registry 与 Tool Execution 逻辑不变。

- [ ] **Step 3: 迁移 `mcp/*` 到 `com.fast.agent.mcp`**
  - 要求：MCP DTO 序列化字段保持兼容。

- [ ] **Step 4: 编译校验**
  - 命令：`cd backend && mvn -DskipTests compile`
  - 预期：编译通过。

---

### Task 7: 全量回归验证（一期验收）

- [ ] **Step 1: 打包验证**
  - 命令：`cd backend && mvn -DskipTests package`
  - 预期：`BUILD SUCCESS`。

- [ ] **Step 2: 启动验证**
  - 命令：`cd backend && mvn spring-boot:run`
  - 预期：应用启动成功，端口监听正常。

- [ ] **Step 3: 接口冒烟**
  - 覆盖：
    - `POST /api/auth/login`
    - `GET /api/auth/me`
    - `POST /api/chat/create`
    - `GET /api/chat/list`
    - `POST /api/chat/send`
    - `GET /api/chat/history/{chatId}`
    - `DELETE /api/chat/delete/{chatId}`

- [ ] **Step 4: WebSocket 冒烟**
  - 覆盖：`/ws/chat` 连接、发送 `send` action 并收到 response。

- [ ] **Step 5: 代码残留检查**
  - 命令：`rg -n "package com\\.agent|import com\\.agent\\." backend/src/main/java`
  - 预期：无结果。

---

## Commit Plan

- Commit 1: `refactor: migrate bootstrap and config packages to com.fast.agent`
- Commit 2: `refactor: move entities and repositories under com.fast.agent`
- Commit 3: `refactor: extract conversation service and slim chat controller`
- Commit 4: `refactor: move rest and websocket components with bean injection`
- Commit 5: `refactor: move engine and mcp packages`
- Commit 6: `chore: phase1 regression checks and cleanup imports`

---

## Risks And Guards

- Risk: 迁移路径后 Spring 扫描不到 Mapper。
  - Guard: 每个任务后执行 `mvn -DskipTests compile`，优先暴露扫描错误。

- Risk: Controller 路径变更导致前端联调断开。
  - Guard: 显式锁定原 `@RequestMapping`，禁止顺带改 URL。

- Risk: WebSocket Handler 依赖为空。
  - Guard: 强制改为 Bean 注入，禁用 `new Handler()`。

- Risk: 聊天消息顺序或删除行为变化。
  - Guard: 对 `findByChatId` 顺序和 `deleteByChatId` 行为做冒烟回归。
