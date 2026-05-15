# MEMORY

## 架构约定

- 数据库表之间不做外键约束（不使用 `FOREIGN KEY`）。
- `namespace_id` 统一 `BIGINT NOT NULL DEFAULT 0`，0 表示全局资源。该规则适用于 agent、llm_model、conversation、usage_log、agent_resource 等所有需要隔离空间的表。

## 角色体系

- `user.is_admin`（BOOLEAN）：true=Global Admin，false=namespace 用户
- `user_namespace.role`：ADMIN=Namespace Admin，USER=User
- `is_admin=true` 的用户不存 `user_namespace` 表

## 用户偏好

- Structured fields for model configuration.
