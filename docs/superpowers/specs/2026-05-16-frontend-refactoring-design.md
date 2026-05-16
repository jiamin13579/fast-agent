# 前端重构设计文档

## 概述

将现有前端从单体式重构为清晰分层、路由驱动、权限感知的架构。后端 Agent Platform 已完整实现，前端需对齐其权限模型和 API 契约。

---

## 一、后端权限模型（前端依赖）

### 三层角色

| 角色 | 判定条件 | `/auth/me` response | Admin API 访问范围 |
|------|---------|---------------------|------------------|
| **Global Admin** | `user.isAdmin=true` | `namespaces: []` | 全部 Admin API |
| **Namespace Admin** | `isAdmin=false` + `user_namespace.role=ADMIN` | `namespaces: [{id, name, role:"ADMIN"}]` | models, agents（仅所属 namespace） |
| **End User** | `isAdmin=false` + `user_namespace.role=USER` | `namespaces: [{id, name, role:"USER"}]` | 无 Admin API 访问 |

### Spring Security 路径规则

| 路径 | 要求 | 影响前端 |
|------|------|---------|
| `/api/admin/namespaces/**` | `ROLE_ADMIN` | Namespace Admin 访问 → 403，前端需隐藏导航 |
| `/api/admin/model-templates/**` | `ROLE_ADMIN` | 同上 |
| `/api/admin/models/**` | `authenticated` | 控制器内 `checkPermission()` 做细粒度检查 |
| `/api/admin/agents/**` | `authenticated` | 同上 |
| `/api/admin/users/**` | `authenticated` | 仅 Global Admin（控制器内 `getIsAdmin()` 检查） |
| `/api/agents/**` | `authenticated` | 用户端，无角色限制 |
| `/api/conversations/**` | `authenticated` | 所有权检查，admin 也不能看别人的会话 |

### 控制器内权限检查 `checkPermission(namespaceId)`

```java
if (NamespaceContext.getIsAdmin()) return;           // Global Admin 放行
if (namespaceId == 0L) throw FORBIDDEN;               // ns=0 仅 Global Admin
check user_namespace WHERE userId=? AND nsId=? AND role='ADMIN';
```

### 对前端的关键约束

1. **Nav 导航必须按角色显示** — Global Admin 看到全部 4 项，Namespace Admin 只能看到 Models 和 Agents
2. **Namespace Admin 的 Model/Agent list 自动锁定到当前 namespace** — 不可全量查看
3. **NamespaceSwitcher 仅 `namespaces.length > 0` 时显示** — Global Admin 无此数据
4. **查询参数是 `namespaceId`（驼峰）** — 当前前端用的 `namespace_id` 实际无效，需修复
5. **会话重命名用 `PATCH`** — 不是 `PUT`
6. **Namespace Admin 切换 namespace 后需要新判断权限** — 用户在不同 namespace 可有不同 role（一个 ns 里是 ADMIN，另一个是 USER），切换后该有/无的管理菜单和操作权限需同步

### 后端改动：AuthService.getNamespaces() 返回 namespace name

**改后 response**:

```json
{
  "namespaces": [
    {"id": 1, "name": "默认空间", "role": "ADMIN"},
    {"id": 2, "name": "测试空间", "role": "USER"}
  ]
}
```

**改动点**: `AuthService.java` 注入 `NamespaceMapper`，在 `getNamespaces()` 中根据 `namespaceId` 查询 `name`。

---

## 二、前端目标架构

### 目录结构

```
src/
├── app/
│   ├── layout.tsx                         # Root: fonts, metadata, Toaster
│   ├── globals.css
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (user)/                            # 用户端（需认证）
│   │   ├── layout.tsx                     # UserLayout
│   │   ├── page.tsx                       # redirect → /conversations
│   │   └── conversations/
│   │       ├── page.tsx                   # 默认选中第一个会话
│   │       └── [uuid]/page.tsx            # 会话详情（消息+输入）
│   └── (admin)/                           # 管理端（需角色守卫）
│       ├── layout.tsx                     # AdminLayout + AdminGuard
│       ├── page.tsx                       # redirect: Global Admin → /admin/namespaces, Namespace Admin → /admin/models
│       ├── namespaces/
│       │   ├── page.tsx
│       │   └── [id]/users/page.tsx
│       ├── model-templates/page.tsx
│       ├── models/page.tsx
│       └── agents/page.tsx
├── components/
│   ├── ui/                                # shadcn（不动）
│   ├── user/
│   │   ├── layout/
│   │   │   ├── UserSidebar.tsx            # 对话/设置 tab
│   │   │   └── UserHeader.tsx             # NS switcher + user menu
│   │   ├── conversation/
│   │   │   ├── ConversationView.tsx       # 主容器
│   │   │   ├── MessageList.tsx            # 消息列表
│   │   │   ├── MessageBubble.tsx          # 单条消息
│   │   │   ├── ChatInput.tsx              # 输入框
│   │   │   ├── ConversationSidebar.tsx    # 会话列表侧栏
│   │   │   └── ConversationItem.tsx       # 单个会话项
│   │   ├── selectors/
│   │   │   ├── AgentSelect.tsx
│   │   │   └── ModelSelect.tsx
│   │   └── NamespaceSwitcher.tsx
│   └── admin/
│       ├── layout/
│       │   ├── AdminGuard.tsx             # 按角色守卫 + 重定向
│       │   └── AdminSidebar.tsx           # 按角色显示菜单
│       ├── namespaces/
│       │   ├── NamespaceList.tsx
│       │   ├── NamespaceForm.tsx
│       │   └── NamespaceUsers.tsx
│       ├── models/
│       │   ├── ModelList.tsx
│       │   └── ModelForm.tsx
│       ├── agents/
│       │   ├── AgentList.tsx
│       │   ├── AgentForm.tsx
│       │   └── ResourceBindingDialog.tsx
│       └── model-templates/
│           ├── ModelTemplateList.tsx
│           └── ModelTemplateForm.tsx
├── lib/
│   ├── api/
│   │   ├── client.ts                      # Fetch wrapper
│   │   ├── auth.ts                        # login, getMe
│   │   ├── conversations.ts               # list, create, rename(PATCH), delete, send, getHistory
│   │   ├── agents.ts                      # listForUser, getDetail, getResources
│   │   ├── admin-models.ts                # list(namespaceId), create, update, delete
│   │   ├── admin-agents.ts                # list(namespaceId), create, update, delete, bindResource, unbind
│   │   ├── admin-namespaces.ts            # list, create, listUsers, updateRole
│   │   └── admin-model-templates.ts       # list, create, update, delete
│   ├── hooks/
│   │   ├── use-auth.ts                    # AuthProvider + useAuth hook
│   │   ├── use-namespace.ts               # NamespaceProvider + useNamespace hook
│   │   ├── use-conversations.ts           # 会话列表 + 选中状态
│   │   ├── use-messages.ts                # 消息加载 + streaming 拼接
│   │   └── use-socket.ts                  # Socket.io 连接管理
│   ├── config.ts
│   ├── socket.ts
│   └── utils.ts                           # cn()
├── types/
│   ├── auth.ts                            # User, NamespaceInfo, LoginResponse
│   ├── chat.ts                            # Conversation, Message
│   └── admin.ts                           # Namespace, LlmModel, Agent, AgentResource, ModelTemplate
└── middleware.ts                          # auth cookie 检查（不变）
```

---

## 三、架构分层

### 3.1 类型层 ── `types/`

统一实体类型定义，消除各组件重复定义。字段对齐后端驼峰命名。

```typescript
// types/auth.ts
export interface User {
  id: number;
  email: string;
  nickname: string;
  isAdmin: boolean;
  mustChangePassword: boolean;
}

export interface NamespaceInfo {
  id: number;
  name: string;      // 后端 AuthService 新增返回
  role: "ADMIN" | "USER";
}

export interface LoginResponse {
  token: string;
  user: User;
  namespaces: NamespaceInfo[];
}
```

```typescript
// types/admin.ts
export interface Namespace {
  id: number;
  code: string;
  name: string;
  description: string;
  status: number;
}

export interface LlmModel {
  id: number;
  namespaceId: number;
  name: string;
  provider: string;
  modelName: string;
  apiKey: string;
  baseUrl: string;
  maxTokens: number;
  temperature: number;
  status: number;
}

export interface Agent {
  id: number;
  namespaceId: number;
  name: string;
  description: string;
  systemPrompt: string;
  status: number;
  version: number;
}

export interface AgentResource {
  id: number;
  agentId: number;
  resourceType: "MODEL" | "TOOL" | "SKILL" | "MCP";
  resourceId: number;
}

export interface ModelTemplate {
  id: number;
  name: string;
  provider: string;
  modelName: string;
  baseUrl: string;
  maxTokens: number;
  temperature: number;
  description: string;
}
```

```typescript
// types/chat.ts
export interface Conversation {
  id: number;
  uuid: string;
  name: string;
  userId: number;
  agentId: number | null;
  modelId: number | null;
  namespaceId: number;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: number;
  uuid: string;
  conversationUuid: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

export interface CreateConversationRequest {
  name: string;
  agent_id: number;
  model_id: number;
  namespace_id: number;
}

export interface SendMessageRequest {
  content: string;
  client_msg_id: string;
}
```

### 3.2 API 层 ── `lib/api/`

当前: 组件内直接 `api.get(...)` + `useEffect` 散落各处。

改为: 每个领域有独立模块，组件只调函数，不关心 HTTP。

```typescript
// lib/api/client.ts — 底层 fetch 封装（保持不变）
export function apiRequest<T>(endpoint: string, options?: RequestOptions): Promise<T>;
export const api = { get, post, put, patch, delete };
```

```typescript
// lib/api/auth.ts
export async function login(email: string, password: string): Promise<LoginResponse>;
export async function getMe(): Promise<{ user: User; namespaces: NamespaceInfo[] }>;
```

```typescript
// lib/api/conversations.ts
export async function listConversations(): Promise<Conversation[]>;
export async function createConversation(data: CreateConversationRequest): Promise<Conversation>;
export async function renameConversation(uuid: string, name: string): Promise<void>;   // PATCH
export async function deleteConversation(uuid: string): Promise<void>;
export async function sendMessage(uuid: string, content: string, clientMsgId: string): Promise<void>;
export async function getMessages(uuid: string): Promise<Message[]>;
```

```typescript
// lib/api/agents.ts — 用户端
export async function listAgents(namespaceId: number): Promise<Agent[]>;
export async function getAgentResources(agentId: number, type: string): Promise<AgentResource[]>;
```

```typescript
// lib/api/admin-models.ts
export async function listModels(namespaceId?: number): Promise<LlmModel[]>;
export async function createModel(data: Partial<LlmModel>): Promise<void>;
export async function updateModel(id: number, data: Partial<LlmModel>): Promise<void>;
export async function deleteModel(id: number): Promise<void>;
```

```typescript
// lib/api/admin-agents.ts
export async function listAgents(namespaceId?: number): Promise<Agent[]>;
export async function createAgent(data: Partial<Agent>): Promise<void>;
export async function updateAgent(id: number, data: Partial<Agent>): Promise<void>;
export async function deleteAgent(id: number): Promise<void>;
export async function bindResource(agentId: number, type: string, resourceId: number): Promise<void>;
export async function unbindResource(agentId: number, resourceId: number, type: string): Promise<void>;
```

### 3.3 Hooks 层 ── `lib/hooks/`

将数据获取 + 状态管理从组件中抽离。

```
lib/
├── socket.ts          ← Socket.io 单例客户端（纯函数，无 React 依赖）
└── hooks/
    ├── use-socket.ts  ← React hook，内部调 socket.ts，管理连接生命周期
    ├── use-auth.ts
    └── ...
```

```typescript
// lib/socket.ts — Socket.io 单例（不变，不依赖 React）
export function getSocket(): Socket;
export function joinRoom(room: string): void;
export function leaveRoom(room: string): void;
export function onEvent(event: string, handler): void;
export function offEvent(event: string, handler?): void;

// hooks/use-socket.ts — React 封装，组件只通过 hook 使用 socket
// 提供: useSocket()
// 封装: 自动将 stream_event 映射为 React state 更新
// 事件: onStreamEvent(type, callback), offStreamEvent(type, callback)

// hooks/use-auth.ts
// 提供: AuthProvider + useAuth()
// 状态: user, isAdmin, namespaces, loading
// 初始化: mount 时调 getMe()，并存到 context
// 方法: login(email, password), logout()
// logout: clearAuth() + router.push("/login")

// hooks/use-namespace.ts
// 提供: NamespaceProvider + useNamespace()
// 内部依赖: useAuth() 获取 user 信息
// 状态: currentNamespaceId, namespaces, isCurrentNsAdmin
// 计算: isCurrentNsAdmin = !user.isAdmin && namespaces.find(ns.id===currentId)?.role === "ADMIN"
// 注意: isCurrentNsAdmin 在切换 namespace 时自动重算
// 持久化: localStorage('current_namespace_id')
// 逻辑: isAdmin=true 时 currentNamespaceId=0，namespaces 为空
// 切换: switchNamespace(id) → 更新 localStorage + 重算 isCurrentNsAdmin

// Provider 层级（在 (user)/layout.tsx 和 (admin)/layout.tsx 中）:
// <AuthProvider>
//   <NamespaceProvider>
//     {children}
//   </NamespaceProvider>
// </AuthProvider>

// hooks/use-conversations.ts
// 状态: conversations[], selectedUuid, loading
// 方法: list(), create(), rename(), delete(), select(uuid)
// 注意: 会话是用户级（非 namespace 级），list 返回用户所有会话
//       namespaceId 仅用于标记新建会话时的上下文（agent/model 选择）
//       切换 namespace 不影响会话列表

// hooks/use-messages.ts
// 输入: conversationUuid
// 状态: messages[], streaming, error
// 逻辑: load history + useSocket.onStreamEvent 拼接 chunk
// 方法: send(content), clear()
```

### 3.4 组件层

**UserSidebar** — 替代当前 view state 体系，使用 Next.js `usePathname()` + `useRouter()` 导航：

```typescript
// icon + label + href
navItems = [
  { icon: MessageSquare, label: "对话", href: "/conversations" },
  // Settings 暂移除（无后端 API），保留占位
]
```

**UserHeader** — 包含 NamespaceSwitcher + 用户下拉菜单（退出登录）。

**ConversationView** — 由 conversation/ 目录下 6 个组件组成，720 行单体拆解为：

```
ConversationView          ← 容器：sidebar + messageArea + input
├── ConversationSidebar   ← 会话列表 + 新建按钮
│   └── ConversationItem  ← 单个会话（重命名/删除）
├── [message area]
│   ├── AgentSelect       ← 选 Agent
│   ├── ModelSelect       ← 选 Model
│   ├── MessageList       ← 消息列表
│   │   └── MessageBubble ← 单条消息
│   └── ChatInput         ← 输入框
```

**AdminGuard** — 路由守卫组件：

```typescript
function AdminGuard({ children }) {
  const { user } = useAuth();
  const { currentNamespaceId, namespaces } = useNamespace();
  const pathname = usePathname();

  if (!user) redirect("/login");
  if (user.isAdmin) return children;    // Global Admin 全部放行

  // 检查当前 namespace 下是否为 ADMIN
  const currentNs = namespaces.find(ns => ns.id === currentNamespaceId);
  if (!currentNs || currentNs.role !== "ADMIN") redirect("/");

  // Namespace Admin 不允许访问 namespaces / model-templates
  if (pathname.startsWith("/admin/namespaces") || pathname.startsWith("/admin/model-templates")) {
    return <AdminForbidden />;
  }

  return children;
}
```

**AdminSidebar** — 按角色显示菜单：

```typescript
const { user, namespaces } = useAuth();
const { isCurrentNsAdmin } = useNamespace();   // 当前 namespace 的角色判定

const links = []
if (user.isAdmin) links.push({ href: "/admin/namespaces", label: "Namespaces" });
if (user.isAdmin) links.push({ href: "/admin/model-templates", label: "模型模板" });
if (user.isAdmin || isCurrentNsAdmin) links.push({ href: "/admin/models", label: "模型管理" });
if (user.isAdmin || isCurrentNsAdmin) links.push({ href: "/admin/agents", label: "Agent 管理" });
```

**ModelList / AgentList** — Namespace Admin 自动限定 namespace：

```typescript
const { user } = useAuth();
const { currentNamespaceId, isCurrentNsAdmin } = useNamespace();
const nsFilter = isCurrentNsAdmin ? currentNamespaceId : undefined;
// 调 API 时传 nsFilter
// isCurrentNsAdmin 表示：当前选中的 namespace 下用户角色是否为 ADMIN
// 用户切到另一个 ns（role=USER）时，isCurrentNsAdmin=false，hide 管理入口
```

---

## 四、路由与导航

```
/login                   → (public) 登录页
/                        → redirect → /conversations
/conversations           → 用户端首页，默认选中第一个会话
/conversations/[uuid]    → 单个会话详情
/admin                   → redirect: Global Admin → /admin/namespaces, Namespace Admin → /admin/models
/admin/namespaces        → Global Admin 管理 namespace
/admin/namespaces/[id]/users → Global Admin 管理用户角色
/admin/model-templates   → Global Admin 管理模型模板
/admin/models            → Global/Namespace Admin 管理模型
/admin/agents            → Global/Namespace Admin 管理 Agent
```

---

## 五、数据流

### 用户创建并发送消息

```
1. 登录 → /auth/login → { token, user, namespaces }
2. 存储 → localStorage（auth_token, auth_user, auth_namespaces）
3. 显示 → UserLayout: 检测 namespaces.length>0 → NS Switcher
4. 切 NS → localStorage + API header X-Namespace-Id
5. 首页 → /conversations → 加载会话列表
6. 新建 → 显示 AgentSelect → GET /api/agents?namespaceId=X
7. 选 Agent → 显示 ModelSelect → GET /api/agents/{id}/resources?type=MODEL
8. 选 Model → POST /api/conversations { agent_id, model_id, namespace_id, name }
9. 发消息 → POST /api/conversations/{uuid}/messages { content, client_msg_id }
10. 流式 → socket.on("stream_event") 端口 8081 → start/chunk/done/error
```

### 管理员创建 Agent

```
Global Admin:
  → 路由 /admin/agents → AdminGuard 放行（isAdmin=true）
  → 新建 → 选 namespace (含 ns=0) → POST /api/admin/agents
  → 绑定资源 → POST /api/admin/agents/{id}/resources

Namespace Admin:
  → 路由 /admin/agents → AdminGuard 放行（namespace role=ADMIN）
  → 新建 → namespace 锁定到当前 → POST /api/admin/agents
  → 绑定资源 → 只可见自己 namespace 的 model
```

---

## 六、涉及变更文件清单

### 后端变更（1 个文件）

| 文件 | 改动 |
|------|------|
| `AuthService.java` | 注入 `NamespaceMapper`，`getNamespaces()` 返回 `name` |

### 前端变更

| 操作 | 文件 | 说明 |
|------|------|------|
| **删除** | `src/app/(authenticated)/` | 整个路由组（page.tsx 720行 + layout.tsx） |
| **删除** | `src/components/layout.tsx` | AppLayout 上帝组件 |
| **删除** | `src/app/admin/layout.tsx` | 替换为 (admin)/layout.tsx |
| **移动 + 修改** | `src/app/admin/namespaces/[id]/users/page.tsx` | 移到 `src/app/(admin)/namespaces/[id]/users/page.tsx`，更新 API 导入路径 |
| **新建** | `src/types/auth.ts` | User, NamespaceInfo, LoginResponse |
| **新建** | `src/types/admin.ts` | Namespace, LlmModel, Agent, AgentResource, ModelTemplate |
| **新建** | `src/types/chat.ts` | Conversation, Message, CreateConversationRequest |
| **新建** | `src/lib/api/client.ts` | 从 api.ts 搬迁 |
| **新建** | `src/lib/api/auth.ts` | login, getMe |
| **新建** | `src/lib/api/conversations.ts` | 会话 CRUD 函数（PATCH 修正） |
| **新建** | `src/lib/api/agents.ts` | 用户端 agent list/resources |
| **新建** | `src/lib/api/admin-models.ts` | 管理端 model CRUD |
| **新建** | `src/lib/api/admin-agents.ts` | 管理端 agent CRUD + 资源绑定 |
| **新建** | `src/lib/api/admin-namespaces.ts` | namespace CRUD + users |
| **新建** | `src/lib/api/admin-model-templates.ts` | template CRUD |
| **新建** | `src/lib/hooks/use-auth.tsx` | AuthProvider + useAuth |
| **新建** | `src/lib/hooks/use-namespace.tsx` | NamespaceProvider + useNamespace |
| **新建** | `src/lib/hooks/use-conversations.ts` | 会话状态管理 |
| **新建** | `src/lib/hooks/use-messages.ts` | 消息 + streaming |
| **新建** | `src/lib/hooks/use-socket.ts` | Socket.io 封装 |
| **新建** | `src/app/(user)/layout.tsx` | UserLayout |
| **新建** | `src/app/(user)/page.tsx` | redirect → /conversations |
| **新建** | `src/app/(user)/conversations/page.tsx` | 用户首页 |
| **新建** | `src/app/(user)/conversations/[uuid]/page.tsx` | 会话详情 |
| **新建** | `src/app/(admin)/layout.tsx` | AdminLayout + AdminGuard |
| **新建** | `src/app/(admin)/page.tsx` | redirect |
| **新建** | `src/components/user/layout/UserSidebar.tsx` | 左侧导航 |
| **新建** | `src/components/user/layout/UserHeader.tsx` | 顶栏 |
| **新建** | `src/components/user/conversation/ConversationView.tsx` | 主容器 |
| **新建** | `src/components/user/conversation/ConversationSidebar.tsx` | 会话列表侧栏 |
| **新建** | `src/components/user/conversation/ConversationItem.tsx` | 会话项 |
| **新建** | `src/components/user/conversation/MessageList.tsx` | 消息列表 |
| **新建** | `src/components/user/conversation/MessageBubble.tsx` | 消息气泡 |
| **新建** | `src/components/user/conversation/ChatInput.tsx` | 输入框 |
| **新建** | `src/components/admin/layout/AdminGuard.tsx` | 权限守卫 |
| **新建** | `src/components/admin/layout/AdminSidebar.tsx` | 角色感知侧栏 |
| **移动** | `src/components/admin/AdminSidebar.tsx` → `admin/layout/` | 替换为新版本 |
| **移动** | `src/components/admin/NamespaceList.tsx` → `admin/namespaces/` | |
| **移动** | `src/components/admin/NamespaceForm.tsx` → `admin/namespaces/` | |
| **移动** | `src/components/admin/ModelList.tsx` → `admin/models/` | |
| **移动** | `src/components/admin/ModelForm.tsx` → `admin/models/` | |
| **移动** | `src/components/admin/AgentList.tsx` → `admin/agents/` | |
| **移动** | `src/components/admin/AgentForm.tsx` → `admin/agents/` | |
| **移动** | `src/components/admin/ResourceBindingDialog.tsx` → `admin/agents/` | |
| **移动** | `src/components/admin/ModelTemplateList.tsx` → `admin/model-templates/` | |
| **移动** | `src/components/admin/ModelTemplateForm.tsx` → `admin/model-templates/` | |
| **修改** | `src/lib/api.ts` | 精简为 client.ts，修复 namespaceId 参数名 |
| **修改** | `src/lib/auth.ts` | 精简，移除重复逻辑 |
| **重命名** | `src/app/admin/` → `src/app/(admin)/` | 路由组迁移 |
| **测试** | 核对所有 API 调用使用 `namespaceId` 而非 `namespace_id` | |

---

## 七、验收标准

- [ ] Global Admin 登录 → 看到全部 4 个 admin nav 项 → 无 NS Switcher
- [ ] Namespace Admin 登录 → 只看到 Models/Agents nav → 有 NS Switcher → Model/Agent list 自动限定当前 ns
- [ ] End User 登录 → 无 admin nav → 有 NS Switcher → 只有聊天界面
- [ ] 新建会话 → 选 Agent → 选 Model → 创建 → 发送消息 → 流式接收
- [ ] Namespace Admin 访问 `/admin/namespaces` → 403
- [ ] Namespace Admin 访问 `/admin/model-templates` → 403
- [ ] End User 访问任意 `/admin/*` → redirect `/`
- [ ] 所有 API 调用使用 `namespaceId` 参数
- [ ] 会话重命名使用 `PATCH` 方法
- [ ] 无 720 行单体文件，每个组件单一职责
- [ ] 类型定义集中在 `types/`，无组件内重复定义
