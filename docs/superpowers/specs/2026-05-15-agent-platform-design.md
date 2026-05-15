# Agent Platform 架构设计

## 概述

将现有的单 Agent 单模型架构重构为多租户（namespace）Agent 平台。管理员通过模板或手动方式管理模型和 Agent，普通用户在各自 namespace 下选择使用 Agent。

## 架构图

```
┌─────────────────────────────────────────────────────────┐
│              全局资源（namespace_id=0）                  │
│  model_template / llm_model / Agent                     │
│  仅 Global Admin 可管理，所有 namespace 可见            │
└─────────────────────────────────────────────────────────┘
```

## 角色体系

| 角色 | 判定 | 范围 | 职责 |
|------|------|------|------|
| Global Admin | `user.is_admin=true` | 全局 | 管理 namespace、model_template、全局资源（ns=0） |
| Namespace Admin | `user.is_admin=false` + `user_namespace.role=ADMIN` | namespace 级 | 管理所属 namespace 的 model、agent |
| User | `user.is_admin=false` + `user_namespace.role=USER` | namespace 级 | 使用 Agent |

**原则**：is_admin=true 的用户不存 user_namespace。is_admin=false 的用户通过 user_namespace 获得空间内角色。

## 数据库设计

### 新增表（6 张）

#### namespace

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 自增，从 1 开始 |
| code | VARCHAR(50) UNIQUE NOT NULL | 唯一编码，用于程序引用 |
| name | VARCHAR(100) UNIQUE NOT NULL | 名称，唯一 |
| description | VARCHAR(500) | |
| status | INT DEFAULT 1 | 1=启用 0=停用 |
| created_at | DATETIME | |
| updated_at | DATETIME | |

#### user_namespace

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | |
| user_id | BIGINT | 逻辑关联 user.id |
| namespace_id | BIGINT NOT NULL | 逻辑关联 namespace.id |
| role | VARCHAR(20) | ADMIN / USER |

UNIQUE(user_id, namespace_id)

#### model_template

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | |
| name | VARCHAR(100) UNIQUE | 模板名称 |
| provider | VARCHAR(50) | 对应 LLMProvider bean name |
| model_name | VARCHAR(100) | 默认模型名 |
| base_url | VARCHAR(500) | 默认 API 地址 |
| max_tokens | INT | |
| temperature | DECIMAL(3,2) | |
| description | VARCHAR(500) | |
| created_at | DATETIME | |
| updated_at | DATETIME | |

#### llm_model

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | |
| namespace_id | BIGINT NOT NULL | 0=全局模型，其他=空间模型 |
| name | VARCHAR(100) | 模型别名 |
| provider | VARCHAR(50) | 后端 LLMProvider bean name |
| model_name | VARCHAR(100) | API 模型名 |
| api_key | VARCHAR(500) | 加密存储 |
| base_url | VARCHAR(500) | |
| max_tokens | INT | |
| temperature | DECIMAL(3,2) | |
| status | INT DEFAULT 1 | |
| created_at | DATETIME | |
| updated_at | DATETIME | |

UNIQUE(namespace_id, name)

#### agent

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | |
| namespace_id | BIGINT NOT NULL | 0=全局 Agent，其他=namespace Agent |
| name | VARCHAR(100) | |
| description | VARCHAR(500) | |
| system_prompt | TEXT | |
| avatar | VARCHAR(500) | |
| status | INT DEFAULT 1 | |
| version | INT DEFAULT 1 | |
| created_by | BIGINT | |
| created_at | DATETIME | |
| updated_at | DATETIME | |

UNIQUE(namespace_id, name)

#### agent_resource

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | |
| agent_id | BIGINT | 逻辑关联 agent.id |
| resource_type | VARCHAR(20) | MODEL / TOOL / SKILL / MCP |
| resource_id | BIGINT | 逻辑关联对应资源表的主键 |
| created_at | DATETIME | |

UNIQUE(agent_id, resource_type, resource_id)

#### usage_log

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | |
| user_id | BIGINT | |
| namespace_id | BIGINT NOT NULL | |
| agent_id | BIGINT | |
| model_id | BIGINT | |
| conversation_id | VARCHAR(36) | |
| input_tokens | INT | |
| output_tokens | INT | |
| duration_ms | INT | |
| cost | DECIMAL(10,6) | 预留 |
| created_at | DATETIME | |

### 修改表

#### conversation（加 3 个字段）

| 字段 | 类型 | 说明 |
|------|------|------|
| agent_id | BIGINT | 新增，逻辑关联 agent.id |
| model_id | BIGINT | 新增，逻辑关联 llm_model.id |
| namespace_id | BIGINT NOT NULL | 新增 |

#### user（改 role 为 is_admin）

`role` 改为 `is_admin BOOLEAN DEFAULT FALSE`
- `is_admin=true` → 全局管理员
- `is_admin=false` → 空间用户，通过 `user_namespace.role` 确定角色（ADMIN=空间管理员 / USER=普通成员）

### 数据库约定

- 所有表**无外键约束**，关联纯逻辑
- `namespace_id` 统一 `BIGINT NOT NULL`，0=全局资源，其他=namespace 资源。所有表均无默认值，由业务层显式指定。

## 权限矩阵

| 操作 | Global Admin | Namespace Admin | User |
|------|-------------|------------|--------|
| 管理 namespace | ✅ | ❌ | ❌ |
| 管理 model_template | ✅ | ❌ | ❌ |
| 管理全局资源（ns=0 的 Agent 和 Model） | ✅ | ❌ | ❌ |
| 管理所属 namespace 的 Agent/Model | ❌ | ✅ | ❌ |
| 使用 Agent 和 Model（ns=0 + 所属 namespace） | ✅ | ✅ | ✅ |

## API 设计

### 认证与 namespace 切换

```
POST /api/auth/login → { token, user, namespaces: [{id, name, role}] }
GET  /api/auth/me    → { user, namespaces }

请求头: X-Namespace-Id（管理端 API 需要）
```

### 管理端 API

```
# Namespace（仅 Global Admin）
POST   /api/admin/namespaces
GET    /api/admin/namespaces
GET    /api/admin/namespaces/{id}
PUT    /api/admin/namespaces/{id}
DELETE /api/admin/namespaces/{id}
GET    /api/admin/namespaces/{id}/users
PUT    /api/admin/namespaces/{id}/users/{userId}/role

# 模型模板（仅 Global Admin）
POST   /api/admin/model-templates
GET    /api/admin/model-templates
GET    /api/admin/model-templates/{id}
PUT    /api/admin/model-templates/{id}
DELETE /api/admin/model-templates/{id}

# 模型（按 namespace 隔离）

POST   /api/admin/models       → Global Admin: ns=0 / Namespace Admin: ns=所属空间
GET    /api/admin/models       → Global Admin: 所有模型 / Namespace Admin: 自己 namespace 的模型
GET    /api/admin/models/{id}
PUT    /api/admin/models/{id}
DELETE /api/admin/models/{id}

# Agent（按 namespace 隔离）

POST   /api/admin/agents       → Global Admin: ns=0 / Namespace Admin: ns=所属空间
GET    /api/admin/agents       → Global Admin: 所有 + ns=0 / Namespace Admin: 自己 namespace
GET    /api/admin/agents/{id}
PUT    /api/admin/agents/{id}
DELETE /api/admin/agents/{id}
POST   /api/admin/agents/{id}/resources    → body: { resource_type, resource_id }
DELETE /api/admin/agents/{id}/resources/{resourceId}?type=MODEL
```

### 用户端 API

```
GET  /api/agents                 → 当前 namespace 可用 Agent 列表
GET  /api/agents/{id}            → Agent 详情
GET  /api/agents/{id}/resources?type=MODEL     → Agent 绑定的模型列表

POST /api/conversations          → body: {agent_id, model_id, ...}
```

## 后端变更

### 新增 Entity + Mapper + Service + Controller

| 模块 | 文件 |
|------|------|
| entity | Namespace, UserNamespace, ModelTemplate, LlmModel, Agent, AgentResource, UsageLog |
| repository | NamespaceMapper, UserNamespaceMapper, ModelTemplateMapper, LlmModelMapper, AgentMapper, AgentResourceMapper, UsageLogMapper |
| service | NamespaceService, ModelTemplateService, LlmModelService, AgentService, UsageLogService |
| controller | AdminNamespaceController, AdminModelTemplateController, AdminModelController, AdminAgentController, UserAgentController |

### Auth 变更

- `AuthController` /auth/me 返回用户可访问的 namespaces
- `JwtAuthenticationFilter` + `SecurityConfig` 支持从 header 读取 X-Namespace-Id
- 后端新增权限检查拦截：验证请求的 namespace_id 在用户权限范围内

### LLMProvider 变更

- `LLMProviderFactory.getProvider(name)` 改为从 `llm_model` 表动态读取配置
- 或保留现有机制，新增一层查询配置后再调用对应 Provider

### Conversation 变更

- 创建 Conversation 时绑定 agent_id + model_id
- 发送消息时根据 model_id 查 llm_model 配置，动态选择 Provider

### Flyway Migration

新增迁移文件：V2__agent_platform.sql

## 前端变更

### 新增页面

| 路由 | 功能 | 访问权限 |
|------|------|---------|
| /admin/namespaces | 管理 namespace | Global Admin |
| /admin/model-templates | 管理模型模板 | Global Admin |
| /admin/models | 管理模型 | Namespace Admin |
| /admin/agents | 管理 Agent | Global Admin / Namespace Admin |

### 修改页面

- **Header**: 新增 namespace 切换下拉框（登录后展示用户可访问的 namespaces）
- **login**: 登录后重定向至首页，携带当前 namespace
- **ConversationView**: 创建会话时增加选 Agent → 选 Model 的步骤
- **auth/me context**: 存储 namespaces 列表、当前 namespace_id

### 新增组件

- `NamespaceSwitcher` — Header 中的空间切换器
- `AdminLayout` — 管理端布局（侧边栏导航）
- `ModelSelectDialog` — 创建 Agent 时绑定模型的弹窗
- `AgentSelect` — 用户端选 Agent 的下拉组件
- `ModelSelect` — 用户端选 Model 的下拉组件

## 数据流

### 用户创建会话

```
1. 用户登录 → /auth/me → { user: {..., is_admin}, namespaces: [{id, name, role}] }
2. 用户选择 namespace（默认第一个）
3. GET /api/agents → 列表（ns=0 + 当前 namespace）
3. GET /api/agents → 列表（ns=0 + 当前 namespace）
4. 选择一个 Agent
5. GET /api/agents/{id}/resources?type=MODEL → 该 Agent 绑定的模型
6. 选择一个 Model
7. POST /api/conversations { agent_id, model_id } → 创建会话
8. 发送消息 → 会话携带 agent_id + model_id
```

### 管理员创建 Agent

```
Global Admin 创建全局 Agent（ns=0）:
1. Global Admin 登录
2. POST /api/admin/agents { namespace_id: 0, name, description, system_prompt }
3. POST /api/admin/agents/{id}/resources { resource_type: "MODEL", resource_id }
4. 所有 namespace 用户可见

Namespace Admin 创建 namespace Agent:
1. Namespace Admin 登录，当前 namespace=A
2. POST /api/admin/agents { namespace_id: A, name, ... }
3. POST /api/admin/agents/{id}/resources { resource_type: "MODEL", resource_id }
4. 仅 namespace A 的用户可见
```

## 边界情况

- namespace_id=0 的资源（model_template / llm_model / Agent）不绑定任何实际 namespace
- Namespace Admin 尝试跨 namespace 操作 → 403
- User 尝试创建/编辑资源 → 403
- llm_model.api_key 加密存储（后续实现，第一阶段可明文）
- status=0 的 Agent/Model 对 User 不可见，但 Global Admin / Namespace Admin 仍可见
- 创建 Agent 时至少绑定一个 resource，否则无法使用
