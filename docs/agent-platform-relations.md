# Agent Platform 设计关系图

---

## 一、实体清单

### 1. namespace（空间/租户）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 主键 |
| code | VARCHAR(50) UNIQUE NOT NULL | 唯一编码，用于程序引用 |
| name | VARCHAR(100) UNIQUE NOT NULL | 空间名称，唯一 |
| description | VARCHAR(500) | 描述 |
| status | INT DEFAULT 1 | 1=启用 0=停用 |
| created_at | DATETIME | |
| updated_at | DATETIME | |

**约定**：id 从 1 开始自增。namespace_id=0 是系统保留占位值（NOT NULL 约束用），表示全局资源。不存在 id=0 的 namespace 行。

---

### 2. user（用户）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | |
| ... | | 现有字段不变 |
| is_admin | BOOLEAN DEFAULT FALSE | true=全局管理员，false=空间用户 |

**说明**：is_admin=true 的用户不存 user_namespace。is_admin=false 的用户通过 user_namespace 获得空间内角色。

---

### 3. user_namespace（用户-空间关联）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | |
| user_id | BIGINT | 逻辑关联 user.id |
| namespace_id | BIGINT NOT NULL | 逻辑关联 namespace.id |
| role | VARCHAR(20) | ADMIN / USER（空间内角色） |

**约束**：UNIQUE(user_id, namespace_id)

**说明**：
- `user.is_admin=true` 的用户**不存此表**
- `user.is_admin=false` + 此表 role=ADMIN → 该空间的管理员
- `user.is_admin=false` + 此表 role=USER → 该空间的普通用户

---

### 4. model_template（模型模板）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | |
| name | VARCHAR(100) UNIQUE | 模板名称，如 "OpenAI GPT-4o" |
| provider | VARCHAR(50) | 对应后端 LLMProvider bean name |
| model_name | VARCHAR(100) | 默认模型名 |
| base_url | VARCHAR(500) | 默认 API 地址 |
| max_tokens | INT | 默认值 |
| temperature | DECIMAL(3,2) | 默认值 |
| description | VARCHAR(500) | 模板说明 |
| created_at | DATETIME | |
| updated_at | DATETIME | |

**创建权限**：仅 `is_admin=true` 的用户可创建和管理。模板是全局资源，不属于任何 namespace。

---

### 5. llm_model（模型）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | |
| namespace_id | BIGINT NOT NULL | 0=全局模型，其他=namespace 模型 |
| name | VARCHAR(100) | 模型别名，如 "生产 GPT-4o" |
| provider | VARCHAR(50) | 后端 LLMProvider bean name |
| model_name | VARCHAR(100) | API 模型名 |
| api_key | VARCHAR(500) | API Key（加密存储） |
| base_url | VARCHAR(500) | API 地址 |
| max_tokens | INT | |
| temperature | DECIMAL(3,2) | |
| status | INT DEFAULT 1 | 1=启用 0=停用 |
| created_at | DATETIME | |
| updated_at | DATETIME | |

**约束**：UNIQUE(namespace_id, name)

**创建方式**：可选模板预填，也可手动录入。

---

### 6. agent（智能体）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | |
| namespace_id | BIGINT NOT NULL | 0=全局 Agent，其他=namespace Agent |
| name | VARCHAR(100) | Agent 名称 |
| description | VARCHAR(500) | 描述 |
| system_prompt | TEXT | 系统提示词 |
| avatar | VARCHAR(500) | 头像 URL |
| status | INT DEFAULT 1 | 1=启用 0=停用 |
| version | INT DEFAULT 1 | 版本号 |
| created_by | BIGINT | 创建人 user.id |
| created_at | DATETIME | |
| updated_at | DATETIME | |

**约束**：UNIQUE(namespace_id, name)

**可见性规则**：查询时 `WHERE namespace_id = 0 OR namespace_id = ?`

---

### 7. agent_resource（Agent 资源关联）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | |
| agent_id | BIGINT | 逻辑关联 agent.id |
| resource_type | VARCHAR(20) | 资源类型：MODEL / TOOL / SKILL / MCP |
| resource_id | BIGINT | 逻辑关联对应资源表的主键 |
| created_at | DATETIME | |

**约束**：UNIQUE(agent_id, resource_type, resource_id)

---

### 8. conversation（会话）（修改现有表）

| 字段 | 类型 | 说明 |
|------|------|------|
| ... | | 现有字段不变 |
| agent_id | BIGINT | 新增，逻辑关联 agent.id |
| model_id | BIGINT | 新增，逻辑关联 llm_model.id |
| namespace_id | BIGINT NOT NULL | 新增 |

---

### 9. usage_log（使用日志）

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

---

## 二、关系总结

```
user（is_admin=true / is_admin=false）
│
├── is_admin=true: 纯全局身份（Global Admin）
│   ├── 管理 namespace
│   ├── 管理 model_template
│   ├── 管理全局资源（namespace_id=0 的 Agent/Model）
│   └── 不关联具体 namespace
│
├── is_admin=false + user_namespace.role=ADMIN（Namespace Admin）
│   ├── 管理所属空间的 model、agent
│   └── 不可见其他空间资源
│
└── is_admin=false + user_namespace.role=USER（User）
    ├── 所属空间内可使用 Agent
    └── 不可见其他空间资源

namespace（空间，id >= 1）
├── 资源（按 namespace_id 隔离）
│   ├── llm_model
│   │     ↑
│   │     │ agent_resource (多对多)
│   │     ↓
│   └── agent (namespace_id=空间ID)
│
├── user_namespace (ADMIN / USER)
│
└── 全局资源（namespace_id=0，仅 is_admin=true 管理）
    ├── model_template
    ├── llm_model (namespace_id=0)
    └── agent (namespace_id=0)
```

---

## 三、权限矩阵

| 操作 | Global Admin | Namespace Admin | User |
|------|-------------|----------------|------|
| 管理 namespace | ✅ | ❌ | ❌ |
| 管理 model_template | ✅ | ❌ | ❌ |
| 管理全局资源（ns=0 的 Agent/Model） | ✅ | ❌ | ❌ |
| 管理所属 namespace 的 Agent/Model | ❌ | ✅ | ❌ |
| 使用 Agent（ns=0 + 所属 namespace） | ✅ | ✅ | ✅ |

---

## 四、API 设计

### 管理端 API

```
# Namespace 管理（仅 Global Admin）
POST   /api/admin/namespaces
GET    /api/admin/namespaces
GET    /api/admin/namespaces/{id}
PUT    /api/admin/namespaces/{id}
DELETE /api/admin/namespaces/{id}
GET    /api/admin/namespaces/{id}/users
PUT    /api/admin/namespaces/{id}/users/{userId}/role

# 模型模板管理（仅 Global Admin）
POST   /api/admin/model-templates
GET    /api/admin/model-templates
GET    /api/admin/model-templates/{id}
PUT    /api/admin/model-templates/{id}
DELETE /api/admin/model-templates/{id}

# 模型管理（按 namespace 隔离）
POST   /api/admin/models
GET    /api/admin/models
GET    /api/admin/models/{id}
PUT    /api/admin/models/{id}
DELETE /api/admin/models/{id}

# Agent 管理（ns=0 仅 Global Admin，ns>0 仅 Namespace Admin）
POST   /api/admin/agents
GET    /api/admin/agents
GET    /api/admin/agents/{id}
PUT    /api/admin/agents/{id}
DELETE /api/admin/agents/{id}
POST   /api/admin/agents/{id}/resources    → body: { resource_type, resource_id }
DELETE /api/admin/agents/{id}/resources/{resourceId}?type=MODEL
```

### 用户端 API

```
# 用户信息
GET /api/auth/me  → namespaces 列表 [{id, name, role}]

# 用户端：查看当前 namespace 下可用 Agent（含 ns=0）
GET /api/agents

# 用户端：查看 Agent 详情及绑定的资源
GET /api/agents/{id}
GET /api/agents/{id}/resources?type=MODEL

# 会话（修改现有接口）
POST /api/conversations  → body 增加 agent_id, model_id, namespace_id
```
