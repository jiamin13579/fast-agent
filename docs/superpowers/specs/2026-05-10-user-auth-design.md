# 用户体系设计

## 概述

实现基于邮箱登录的用户认证体系，支持管理员和普通用户两级权限。

## 用户实体

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| email | String | 登录账号，唯一 |
| phone | String | 手机号（预留，当前可为空） |
| nickname | String | 昵称，支持中文 |
| password | String | BCrypt 加密存储 |
| role | Enum | SUPER_ADMIN / ADMIN / USER |
| status | Enum | ENABLED / DISABLED |
| mustChangePassword | Boolean | 首次登录必须修改密码 |
| createTime | DateTime | 创建时间 |
| updateTime | DateTime | 更新时间 |

## 初始化数据

| 账号 | 密码 | 角色 | 昵称 |
|------|------|------|------|
| superadmin@example.com | 123456 | SUPER_ADMIN | superadmin |
| admin1@example.com | 123456 | ADMIN | 管理员1 |
| admin2@example.com | 123456 | ADMIN | 管理员2 |
| user1@example.com | 123456 | USER | 用户1 |
| user2@example.com | 123456 | USER | 用户2 |
| user3@example.com | 123456 | USER | 用户3 |

## API 设计

### 登录

```
POST /api/auth/login
Body: { "email": "xxx", "password": "xxx" }
Response: { "token": "JWT", "user": { "id", "email", "nickname", "role" } }
Error: 401 { "message": "邮箱或密码错误" }
```

### 当前用户

```
GET /api/auth/me
Headers: Authorization: Bearer <token>
Response: { "id", "email", "nickname", "role" }
```

### 管理员重置用户密码

```
POST /api/admin/users/{id}/reset-password
Headers: Authorization: Bearer <token> (需 ADMIN 或 SUPER_ADMIN)
Response: { "newPassword": "新密码" }  // 返回随机生成的新密码
```

## JWT 结构

```json
{
  "userId": 1,
  "email": "xxx@example.com",
  "role": "USER",
  "exp": 1234567890
}
```

- 过期时间：7 天
- 存储：前端 localStorage

## 前端页面

- `/login` — 登录页，简洁卡片式
- 登录成功跳转 `/chat`
- 未登录访问其他页面重定向到 `/login`

## 安全策略

- 密码 BCrypt 加密，不可逆
- 登录失败不区分"邮箱不存在"和"密码错误"，防止用户枚举
- 禁用账户无法登录