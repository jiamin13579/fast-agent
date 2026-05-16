# MEMORY

## 架构约定

- 数据库表之间不做外键约束（不使用 `FOREIGN KEY`）。
- `namespace_id` 统一 `BIGINT NOT NULL DEFAULT 0`，0 表示全局资源。该规则适用于 agent、llm_model、conversation、usage_log、agent_resource 等所有需要隔离空间的表。

## 用户/管理端分离架构

### 数据库

- **`user` 表** — 普通用户，用 email 登录，无 is_admin 字段
- **`admin` 表** — 管理员，用 username 登录，is_global_admin 区分全局管理员
- **`admin_namespace`** — 管理员与命名空间的关联 + 角色（ADMIN/VIEWER）
- **`user_namespace`** 表已移除，用户不再关联命名空间

### 后端 API 隔离

| 端 | API prefix | 认证 Filter | JWT Util | JWT Secret |
|----|-----------|-------------|----------|-----------|
| 用户 | `/api/user/**` | `UserAuthFilter` | `UserJwtUtil` | `agent.jwt.user-secret` |
| 管理 | `/api/admin/**` | `AdminAuthFilter` | `AdminJwtUtil` | `agent.jwt.admin-secret` |

- 两套 JWT 签名不同，互不通用
- `AdminContext`（ThreadLocal）存储当前管理员信息，代替原来的 `NamespaceContext`

### 前端

- `user-frontend/` — 独立 Next.js 应用，聊天界面 + 空间切换
- `admin-frontend/` — 独立 Next.js 应用，管理后台 CRUD

### 角色体系

- **全局管理员**: admin.is_global_admin=1，可管理所有资源
- **空间管理员**: admin_namespace.role=ADMIN，可管理被授权空间的 Agent/Model
- **普通用户**: 仅使用 user 表，聊天 + 浏览空间

## 用户偏好

- Structured fields for model configuration.
- 实施执行方式：Subagent-Driven（每个任务派发独立子 agent，任务间 review）
- 开发流程：TDD 测试用例先行
