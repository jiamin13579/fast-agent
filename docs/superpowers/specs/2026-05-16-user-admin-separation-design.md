# 用户前端与管理后台分离设计方案

## 概述

将当前单体架构拆分为用户端和管理端两套独立体系，数据库、认证、API、前端四层完全隔离。

## 数据库层

### 1. `user` 表改造

移除管理员相关字段，仅保留用户信息：

```sql
CREATE TABLE `user` (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    email       VARCHAR(100) NOT NULL UNIQUE,
    phone       VARCHAR(20),
    nickname    VARCHAR(50) NOT NULL,
    password    VARCHAR(255) NOT NULL,
    status      INT NOT NULL DEFAULT 1,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**移除字段**: `is_admin`, `must_change_password`

### 2. 新增 `admin` 表

管理员独立表，用 `username` 登录而非 `email`：

```sql
CREATE TABLE `admin` (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    username         VARCHAR(50) NOT NULL UNIQUE,
    password         VARCHAR(255) NOT NULL,
    nickname         VARCHAR(100),
    is_global_admin  TINYINT(1) NOT NULL DEFAULT 0,
    status           INT NOT NULL DEFAULT 1,
    create_time      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 3. 新增 `admin_namespace` 表

管理员的命名空间权限映射：

```sql
CREATE TABLE `admin_namespace` (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    admin_id     BIGINT NOT NULL,
    namespace_id BIGINT NOT NULL,
    role         VARCHAR(20) NOT NULL DEFAULT 'ADMIN' COMMENT 'ADMIN/VIEWER',
    create_time  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_admin_namespace (admin_id, namespace_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 4. 移除 `user_namespace` 表

用户不再关联命名空间，此表删除。

### 5. 不受影响的表

`namespace`, `model_template`, `llm_model`, `agent`, `agent_resource`, `conversation`, `chat_message`, `usage_log` 结构不变。

### 6. 角色模型

| 角色 | 表 | 判定方式 | 权限 |
|------|---|---------|------|
| 普通用户 | `user` | 登录 `user` 表 | 聊天、切换空间浏览 Agent |
| 全局管理员 | `admin` | `admin.is_global_admin = 1` | 所有管理功能 |
| 空间管理员 | `admin` | `admin_namespace.role = ADMIN` | 管理被授权空间的 Agent/Model |
| 空间观察者 | `admin` | `admin_namespace.role = VIEWER` | 只读查看空间资源 |

## 认证层

### 两套独立认证系统

| 维度 | 用户认证 | 管理员认证 |
|------|---------|-----------|
| API prefix | `/api/user/**` | `/api/admin/**` |
| 登录端点 | `POST /api/user/auth/login` | `POST /api/admin/auth/login` |
| 登录凭证 | `email` + `password` | `username` + `password` |
| 数据源 | `user` 表 | `admin` 表 |
| JWT Secret | `agent.jwt.user-secret` | `agent.jwt.admin-secret` |
| JWT Claims | `userId`, `email` | `adminId`, `username`, `isGlobalAdmin` |
| Auth Filter | `UserAuthFilter` | `AdminAuthFilter` |
| 安全检查 | `UserAuthFilter` 校验用户 JWT | `AdminAuthFilter` 校验管理员 JWT + `is_global_admin`/`admin_namespace` |

### 认证过滤器链

```
SecurityConfig
├── /api/user/auth/login      → permitAll
├── /socket.io/**             → permitAll (用户端实时通信)
├── /error                    → permitAll
├── /api/user/**              → UserAuthFilter (用户 JWT 校验)
├── /api/admin/auth/login     → permitAll
└── /api/admin/**             → AdminAuthFilter (管理员 JWT 校验)
```

### 关键安全规则

- 用户 JWT 无法访问 `/api/admin/**`（签名不同，直接拒签）
- 管理员 JWT 无法访问 `/api/user/**`（签名不同，直接拒签）
- `AdminAuthFilter` 除 JWT 校验外，还需检查 `is_global_admin` 或 `admin_namespace` 中的角色
- 用户端无 `NamespaceContext`，空间信息在前端作为分类展示，无后端权限校验

## API 层

### 用户端 API（`/api/user/`）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/user/auth/login` | 用户登录（email + password），返回 user JWT |
| GET | `/api/user/auth/me` | 获取当前用户信息 |
| GET | `/api/user/agents?namespaceId=` | 按空间列出 Agent |
| GET | `/api/user/agents/{id}` | 获取 Agent 详情 |
| GET | `/api/user/agents/{id}/resources?type=` | 获取 Agent 资源绑定 |
| GET | `/api/user/namespaces` | 列出所有可用空间（只读） |
| POST | `/api/user/conversations` | 创建会话 |
| GET | `/api/user/conversations` | 列出用户会话 |
| DELETE | `/api/user/conversations/{uuid}` | 删除会话 |
| PATCH | `/api/user/conversations/{uuid}` | 重命名会话 |
| POST | `/api/user/conversations/{uuid}/messages` | 发送消息（触发 LLM 流式响应） |
| GET | `/api/user/conversations/{uuid}/messages` | 获取消息历史 |

### 管理端 API（`/api/admin/`）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/admin/auth/login` | 管理员登录（username + password），返回 admin JWT |
| GET | `/api/admin/auth/me` | 获取当前管理员信息 |
| GET/POST/PUT/DELETE | `/api/admin/namespaces/**` | 命名空间 CRUD（全局管理员） |
| GET/POST/PUT/DELETE | `/api/admin/model-templates/**` | 模型模板 CRUD（全局管理员） |
| GET/POST/PUT/DELETE | `/api/admin/models/**` | 模型 CRUD（全局管理员 + 空间管理员） |
| GET/POST/PUT/DELETE | `/api/admin/agents/**` | Agent CRUD（全局管理员 + 空间管理员） |
| POST | `/api/admin/agents/{id}/resources` | 绑定 Agent 资源 |
| DELETE | `/api/admin/agents/{id}/resources/{resId}` | 解绑 Agent 资源 |
| POST | `/api/admin/users` | 创建用户 |
| POST | `/api/admin/users/{id}/reset-password` | 重置用户密码 |
| GET | `/api/admin/namespaces/{id}/users` | 查看空间用户列表 |
| PUT | `/api/admin/namespaces/{id}/users/{userId}` | 更新空间用户角色 |

## 前端层

两个完全独立的 Next.js 应用，位于独立的目录中，不共享代码。

### 用户前端（`user-frontend/`）

```
user-frontend/
├── package.json
├── next.config.mjs
├── tsconfig.json
├── tailwind.config.cjs
└── src/
    ├── app/
    │   ├── layout.tsx           ← 根布局
    │   ├── login/
    │   │   └── page.tsx         ← 用户登录（email + password）
    │   └── (main)/
    │       ├── layout.tsx       ← 空间切换 + 会话列表侧边栏
    │       ├── page.tsx         ← 空间/Agent 选择首页
    │       └── conversations/
    │           └── [uuid]/
    │               └── page.tsx ← 聊天界面
    ├── components/
    │   ├── SpaceSwitcher.tsx    ← 空间切换器
    │   ├── AgentSelector.tsx    ← Agent 选择
    │   ├── ChatView.tsx         ← 聊天视图
    │   └── ui/                  ← UI 基础组件
    ├── lib/
    │   ├── api/
    │   │   ├── client.ts        ← Axios/fetch 客户端（user JWT）
    │   │   ├── auth.ts          ← 登录/用户信息
    │   │   ├── agents.ts        ← Agent 查询
    │   │   ├── conversations.ts ← 会话/消息 CRUD
    │   │   └── namespaces.ts    ← 空间列表
    │   ├── hooks/
    │   │   └── use-auth.tsx     ← AuthProvider + useAuth
    │   ├── socket.ts            ← Socket.IO 客户端
    │   └── config.ts            ← API/WS 地址配置
    ├── types/
    │   └── index.ts             ← TypeScript 类型
    └── middleware.ts            ← 路由保护
```

### 管理前端（`admin-frontend/`）

```
admin-frontend/
├── package.json
├── next.config.mjs
├── tsconfig.json
├── tailwind.config.cjs
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── login/
    │   │   └── page.tsx         ← 管理员登录（username + password）
    │   └── admin/
    │       ├── layout.tsx       ← AdminGuard + AdminSidebar
    │       ├── namespaces/
    │       │   ├── page.tsx     ← 命名空间管理（全局管理员）
    │       │   └── [id]/
    │       │       └── users/
    │       │           └── page.tsx ← 空间用户管理
    │       ├── model-templates/
    │       │   └── page.tsx     ← 模型模板管理（全局管理员）
    │       ├── models/
    │       │   └── page.tsx     ← 模型管理
    │       ├── agents/
    │       │   ├── page.tsx     ← Agent 管理
    │       │   └── [id]/
    │       │       └── resources/
    │       │           └── page.tsx ← Agent 资源绑定
    │       └── users/
    │           └── page.tsx     ← 用户管理
    ├── components/
    │   ├── admin/
    │   │   ├── AdminGuard.tsx   ← 角色守卫
    │   │   ├── AdminSidebar.tsx ← 侧边导航
    │   │   ├── AdminHeader.tsx  ← 顶部栏
    │   │   ├── DataTable.tsx    ← 通用数据表格
    │   │   └── FormDialog.tsx   ← 通用表单弹窗
    │   └── ui/                  ← UI 基础组件
    ├── lib/
    │   ├── api/
    │   │   ├── client.ts        ← Axios/fetch 客户端（admin JWT）
    │   │   ├── auth.ts          ← 管理员登录/信息
    │   │   ├── namespaces.ts    ← 命名空间 CRUD
    │   │   ├── models.ts        ← 模型 CRUD
    │   │   ├── agents.ts        ← Agent CRUD
    │   │   └── users.ts         ← 用户管理
    │   └── hooks/
    │       └── use-auth.tsx     ← AdminAuthProvider + useAdminAuth
    ├── types/
    │   └── index.ts             ← TypeScript 类型
    └── middleware.ts            ← 路由保护
```

## Socket.IO

端口 8081 不变，仅用于用户端实时消息推送。使用 User JWT 做连接鉴权。

## 配置文件变更

`application.yml`:

```yaml
agent:
  jwt:
    user-secret: ${JWT_USER_SECRET:...}
    user-expiration: 604800000    # 7 天
    admin-secret: ${JWT_ADMIN_SECRET:...}
    admin-expiration: 7200000     # 2 小时
```

## 依赖关系

```
user-frontend  ──HTTP──>  backend (:8080/api/user/**)
user-frontend  ──WS───>  backend (:8081/socket.io)

admin-frontend ──HTTP──>  backend (:8080/api/admin/**)
```

两个前端互不感知，后端通过不同的 path prefix 和 JWT secret 隔离。

## 迁移与兼容

1. `user` 表的数据迁移：现有用户保留，`is_admin` 和 `must_change_password` 字段删除
2. 现有 `admin@fast.com` → 迁移至 `admin` 表，`username=admin`，`is_global_admin=1`
3. 用户端 `namespace` 概念退化为"空间分类"，通过 `/api/user/namespaces` 返回所有可用空间
4. `user_namespace` 中的用户关联数据：若业务需要可导出为空间-用户映射记录，但用户端不再使用

## 实施顺序

1. 后端：新增 Admin 实体 + 数据表 + Mapper
2. 后端：拆分认证系统（UserAuthFilter + AdminAuthFilter + JwtUtil 拆分）
3. 后端：重构 API 路径（`/api/user/**` + `/api/admin/**`）
4. 后端：移除 `user_namespace` 引用
5. 后端：新增 `admin_namespace` 权限检查
6. 前端：创建 `user-frontend/` 独立应用
7. 前端：创建 `admin-frontend/` 独立应用
8. 验证：确认用户和管理员登录互不影响
