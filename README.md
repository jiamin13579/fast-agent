# Fast Agent

个人 AI 助手系统

## 技术栈

### 后端
- Spring Boot 3.2.5
- MyBatis 3.0.3 (替代 MyBatis-Plus)
- Spring Security 6 + JWT
- MySQL

### 前端
- Next.js 14
- React 18
- Tailwind CSS 3
- shadcn/ui

## 快速开始

### 后端

```bash
cd backend
mvn spring-boot:run
```

后端运行在 http://localhost:8080

### 前端

```bash
cd frontend
npm install
npm run dev
```

前端运行在 http://localhost:3000

## 默认用户

| 邮箱 | 密码 | 角色 |
|------|------|------|
| superadmin@example.com | 123456 | SUPER_ADMIN |
| admin1@example.com | 123456 | ADMIN |
| admin2@example.com | 123456 | ADMIN |
| user1@example.com | 123456 | USER |
| user2@example.com | 123456 | USER |
| user3@example.com | 123456 | USER |

## API 接口

### 认证

- `POST /api/auth/login` - 登录
- `POST /api/auth/logout` - 登出
- `GET /api/auth/me` - 获取当前用户

### 管理 (需管理员权限)

- `POST /api/admin/users/{id}/reset-password` - 重置用户密码

## 环境变量

### 后端

```bash
export JWT_SECRET=your-secret-key
export LLM_API_KEY=your-api-key
export LLM_BASE_URL=https://api.minimax.chat
```

### 前端

无需额外配置，API 代理已配置。

## 开发说明

- 使用 `Cmd+Shift+R` 硬刷新浏览器以清除缓存
- 前端代码位于 `frontend/src/`
- 后端代码位于 `backend/src/main/java/com/agent/`

## 风格规范与格式化

### 前端

```bash
cd frontend
npm run lint
npm run format:check
```

自动修复格式：

```bash
cd frontend
npm run format
```

### 后端

```bash
cd backend
mvn spotless:check
```

自动修复格式：

```bash
cd backend
mvn spotless:apply
```
