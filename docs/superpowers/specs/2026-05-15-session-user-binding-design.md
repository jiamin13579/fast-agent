# 会话与用户绑定设计

## 需求

用户只能看到自己的会话和列表。会话创建时自动绑定当前登录用户。

## 方案

方案 A：会话层绑定（推荐）
- `conversation` 表新增 `user_id` 字段
- 创建会话时自动关联当前用户
- 列表查询按当前用户过滤
- 所有会话操作校验所有权

不做多租户、不做消息层绑定（YAGNI）。

## 数据库变更

```sql
ALTER TABLE conversation
    ADD COLUMN user_id BIGINT NOT NULL DEFAULT 1 AFTER id,
    ADD INDEX idx_user_id (user_id);
```

已有数据默认分配给 id=1 的超级管理员。

## 实体变更

### Conversation.java

| 字段 | 类型 | 说明 |
|------|------|------|
| userId | Long | 所有者用户 ID |

### ConversationMapper.java

| 方法 | 说明 |
|------|------|
| `findByUserId(userId)` | 按用户查询会话列表（替代 `findAll()`） |
| `findByUuidAndUserId(uuid, userId)` | 查询并校验所有权 |

## Service 变更

### ConversationService

| 方法 | 变更 |
|------|------|
| `createConversation(name)` | 从 SecurityContext 获取当前 userId，set 到 conversation |
| `listConversations()` | 改为调用 `findByUserId(currentUserId)` |
| `deleteConversation(uuid)` | 先查 `findByUuidAndUserId`，不存在则抛异常 |
| `renameConversation(uuid, name)` | 同上，校验所有权 |
| `send(conversationUuid, content, clientMsgId)` | 校验 conversation 属于当前用户 |
| `getHistory(conversationUuid)` | 校验 conversation 属于当前用户 |

获取当前用户 ID 方式：
```java
SecurityContextHolder.getContext().getAuthentication().getPrincipal() // "1"
```
封装为 `getCurrentUserId()` 工具方法。

## 受影响文件

1. `schema.sql` — 加 user_id 列和索引
2. `Conversation.java` — 加 userId 字段
3. `ConversationMapper.java` — 新增 findByUserId, findByUuidAndUserId
4. `ConversationService.java` — 所有方法接入 userId 校验
5. `ConversationController.java` — 添加 getCurrentUserId helper

## 边界情况

- 无认证用户请求（已被 SecurityConfig 拦截，不会到达 Controller）
- 操作不属于自己的会话 → 抛出 `ResponseStatusException(HttpStatus.FORBIDDEN, "无权限")`
- 已有数据迁移 → 通过 DDL 默认值分配给 id=1 的超级管理员

## 未实现（后续可能）

- 消息表 `chat_message` 绑定用户
- 管理员查看所有会话的能力
- 会话共享/协作
