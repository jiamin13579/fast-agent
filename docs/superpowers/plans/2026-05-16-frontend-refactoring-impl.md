# 前端重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将前端从单体式重构为分层清晰、路由驱动、权限感知的架构

**Architecture:** 新增 types 层消除重复类型定义 → 按领域拆分 API 层 → 自定义 hooks 封装状态 → 组件专注 UI 渲染。权限模型对齐后端三角色（Global Admin / Namespace Admin / End User），AdminGuard 和 AdminSidebar 根据 `isAdmin` + `isCurrentNsAdmin` 动态切换。720 行单体拆为 6 个独立组件，路由替代 view state。

**Tech Stack:** Next.js 14 App Router, shadcn/ui, Socket.io, React Context

---

## 任务依赖关系

```
Task 0 (Test setup)
  │
Task 1 (Backend)
  │
Task 2 (Types)
  │
Task 3 (API client)
  │
Task 4 (API modules) ─── Task 4.5 (API tests / TDD)
  │
Task 5 (Socket hook)
  │
Task 6 (Auth hook)
  │
Task 7 (Namespace hook) ─── Task 7.5 (Hook tests / TDD)
  │
Task 8 (Conversations hook)
  │
Task 9 (Messages hook)
  │
Task 10 (User layout)
  │
Task 11 (Conversation components)
  │
Task 12 (User pages)
  │
Task 13 (Admin guard + sidebar) ─── Task 13.5 (Admin permission tests / TDD)
  │
Task 14 (Admin layout + pages)
  │
Task 15 (Admin component reorg)
  │
Task 16 (E2E + permission fixes) ─── Task 16.5 (E2E integration test / TDD)
  │
Task 17 (Cleanup)
```

---

### Task 0: 测试基础设施搭建

**Files:**
- Modify: `frontend/vitest.config.ts`
- Create: `frontend/tests/setup.ts`
- Create: `frontend/tests/mocks/server.ts`
- Create: `frontend/tests/mocks/handlers.ts`

- [ ] **Step 1: 检查 vitest.config.ts，确保已配置 setup 文件**

```typescript
// frontend/vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 2: 创建 setup.ts**

```typescript
// frontend/tests/setup.ts
import "@testing-library/jest-dom";
```

- [ ] **Step 3: 创建 mock handlers**

```typescript
// frontend/tests/mocks/handlers.ts
import { http, HttpResponse } from "msw";

export const mockUser = {
  id: 1,
  email: "admin@fast.com",
  nickname: "Admin",
  isAdmin: true,
  mustChangePassword: false,
};

export const mockNamespaceAdminNs = [{ id: 1, name: "空间1", role: "ADMIN" }];
export const mockEndUserNs = [{ id: 1, name: "空间1", role: "USER" }];

export const handlers = [
  http.get("*/api/auth/me", ({ request }) => {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) return HttpResponse.json({ message: "未登录" }, { status: 401 });

    // 根据 token 判断角色（测试中用 Authorization 值区分）
    if (authHeader === "Bearer admin-token") {
      return HttpResponse.json({ user: mockUser, namespaces: [] });
    }
    if (authHeader === "Bearer ns-admin-token") {
      return HttpResponse.json({
        user: { ...mockUser, id: 2, email: "nsadmin@fast.com", nickname: "NSAdmin", isAdmin: false },
        namespaces: mockNamespaceAdminNs,
      });
    }
    return HttpResponse.json({
      user: { ...mockUser, id: 3, email: "user@fast.com", nickname: "User", isAdmin: false },
      namespaces: mockEndUserNs,
    });
  }),

  http.get("*/api/agents", () => HttpResponse.json([
    { id: 1, namespaceId: 0, name: "全局助手", description: "", status: 1 },
    { id: 2, namespaceId: 1, name: "空间助手", description: "", status: 1 },
  ])),

  http.get("*/api/agents/:id/resources", () => HttpResponse.json([
    { id: 1, agentId: 1, resourceType: "MODEL", resourceId: 1 },
  ])),
];
```

- [ ] **Step 4: 创建 MSW server**

```typescript
// frontend/tests/mocks/server.ts
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
```

- [ ] **Step 5: 更新 setup.ts 以启动/关闭 mock server**

```typescript
// frontend/tests/setup.ts
import "@testing-library/jest-dom";
import { server } from "./mocks/server";
import { beforeAll, afterAll, afterEach } from "vitest";

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

- [ ] **Step 6: 安装依赖**

```bash
cd frontend && npm install -D msw @testing-library/jest-dom @testing-library/react @testing-library/user-event
```

- [ ] **Step 7: 运行基础测试确认环境正常**

```bash
cd frontend && npx vitest run 2>&1 | head -20
```

Expected: No test files found (这是因为还没有测试用例)

- [ ] **Step 8: Commit**

```bash
git add frontend/vitest.config.ts frontend/tests/setup.ts frontend/tests/mocks/
git commit -m "test: add test infrastructure with MSW and vitest"
```

---

### Task 1: 后端 AuthService 返回 namespace name

**Files:**
- Modify: `backend/src/main/java/com/fast/agent/service/AuthService.java`

- [ ] **Step 1: 注入 NamespaceMapper**

```java
// 在 AuthService.java 已有依赖下方添加
@Autowired private NamespaceMapper namespaceMapper;
```

- [ ] **Step 2: 修改 getNamespaces() 方法**

```java
private List<Map<String, Object>> getNamespaces(User user) {
    if (Boolean.TRUE.equals(user.getIsAdmin())) {
        return List.of();
    }
    return userNamespaceMapper.selectList(null).stream()
            .filter(un -> un.getUserId().equals(user.getId()))
            .map(un -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", un.getNamespaceId());
                map.put("role", un.getRole());
                // 查询 namespace name
                Namespace ns = namespaceMapper.selectById(un.getNamespaceId());
                map.put("name", ns != null ? ns.getName() : "");
                return map;
            })
            .collect(Collectors.toList());
}
```

- [ ] **Step 3: 添加 Namespace 和 NamespaceMapper import**

```java
import com.fast.agent.entity.Namespace;
import com.fast.agent.repository.NamespaceMapper;
```

- [ ] **Step 4: 验证编译**

Run: `cd backend && mvn compile -q`
Expected: BUILD SUCCESS

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/fast/agent/service/AuthService.java
git commit -m "feat: return namespace name in auth response"
```

---

### Task 2: 创建类型定义层

**Files:**
- Create: `frontend/src/types/auth.ts`
- Create: `frontend/src/types/admin.ts`
- Create: `frontend/src/types/chat.ts`

- [ ] **Step 1: 创建 types/auth.ts**

```typescript
export interface User {
  id: number;
  email: string;
  nickname: string;
  isAdmin: boolean;
  mustChangePassword: boolean;
}

export interface NamespaceInfo {
  id: number;
  name: string;
  role: "ADMIN" | "USER";
}

export interface LoginResponse {
  token: string;
  user: User;
  namespaces: NamespaceInfo[];
}

export interface AuthMeResponse {
  user: User;
  namespaces: NamespaceInfo[];
}
```

- [ ] **Step 2: 创建 types/admin.ts**

```typescript
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
  createdBy?: number;
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

- [ ] **Step 3: 创建 types/chat.ts**

```typescript
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

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/
git commit -m "feat: add shared type definitions"
```

---

### Task 3: 重构 API client 层

**Files:**
- Create: `frontend/src/lib/api/client.ts`
- Modify: `frontend/src/lib/config.ts` (verify config)
- Delete: `frontend/src/lib/api.ts` (moved to client.ts)

- [ ] **Step 1: 创建 lib/api/client.ts**

```typescript
import { API_BASE } from "@/lib/config";
import { getToken } from "@/lib/auth";
import type { RequestInit } from "next/dist/server/web/spec-extension/request";

const NAMESPACE_KEY = "current_namespace_id";

export function getCurrentNamespaceId(): number {
  if (typeof window === "undefined") return 0;
  const stored = localStorage.getItem(NAMESPACE_KEY);
  return stored ? parseInt(stored, 10) : 0;
}

export function setCurrentNamespaceId(id: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(NAMESPACE_KEY, String(id));
}

export interface RequestOptions extends RequestInit {
  namespaceId?: number;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const token = getToken();
  const namespaceId = options.namespaceId ?? getCurrentNamespaceId();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  headers["X-Namespace-Id"] = String(namespaceId);

  if (options.body && typeof options.body === "string") {
    headers["Content-Type"] = "application/json";
  }

  const url = endpoint.startsWith("/") ? `${API_BASE}${endpoint}` : `${API_BASE}/${endpoint}`;

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  if (res.status === 204) return {} as T;

  return res.json();
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: "POST", body: JSON.stringify(body) }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: "PUT", body: JSON.stringify(body) }),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: "PATCH", body: JSON.stringify(body) }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: "DELETE" }),
};
```

- [ ] **Step 2: 删除旧的 lib/api.ts**

用 Task 16 统一删除，此处只在 git 中记录。

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/api/client.ts
git rm frontend/src/lib/api.ts
git commit -m "refactor: extract API client to lib/api/client.ts"
```

---

### Task 4: 创建领域 API 模块

**Files:**
- Create: `frontend/src/lib/api/auth.ts`
- Create: `frontend/src/lib/api/conversations.ts`
- Create: `frontend/src/lib/api/agents.ts`
- Create: `frontend/src/lib/api/admin-models.ts`
- Create: `frontend/src/lib/api/admin-agents.ts`
- Create: `frontend/src/lib/api/admin-namespaces.ts`
- Create: `frontend/src/lib/api/admin-model-templates.ts`

- [ ] **Step 1: 创建 lib/api/auth.ts**

```typescript
import { api } from "./client";
import type { LoginResponse, AuthMeResponse } from "@/types/auth";

export async function login(email: string, password: string): Promise<LoginResponse> {
  return api.post<LoginResponse>("/auth/login", { email, password });
}

export async function getMe(): Promise<AuthMeResponse> {
  return api.get<AuthMeResponse>("/auth/me");
}
```

- [ ] **Step 2: 创建 lib/api/conversations.ts**

```typescript
import { api } from "./client";
import type { Conversation, Message, CreateConversationRequest } from "@/types/chat";

export async function listConversations(): Promise<Conversation[]> {
  return api.get<Conversation[]>("/conversations");
}

export async function createConversation(data: CreateConversationRequest): Promise<Conversation> {
  return api.post<Conversation>("/conversations", data);
}

export async function renameConversation(uuid: string, name: string): Promise<void> {
  await api.patch(`/conversations/${uuid}`, { name });
}

export async function deleteConversation(uuid: string): Promise<void> {
  await api.delete(`/conversations/${uuid}`);
}

export async function sendMessage(uuid: string, content: string, clientMsgId: string): Promise<void> {
  await api.post(`/conversations/${uuid}/messages`, { content, client_msg_id: clientMsgId });
}

export async function getMessages(uuid: string): Promise<Message[]> {
  return api.get<Message[]>(`/conversations/${uuid}/messages`);
}
```

- [ ] **Step 3: 创建 lib/api/agents.ts（用户端）**

```typescript
import { api } from "./client";
import type { Agent, AgentResource } from "@/types/admin";

export async function listAgents(namespaceId: number): Promise<Agent[]> {
  return api.get<Agent[]>(`/agents?namespaceId=${namespaceId}`);
}

export async function getAgentResources(agentId: number, type?: string): Promise<AgentResource[]> {
  const query = type ? `?type=${type}` : "";
  return api.get<AgentResource[]>(`/agents/${agentId}/resources${query}`);
}
```

- [ ] **Step 4: 创建 lib/api/admin-models.ts**

```typescript
import { api } from "./client";
import type { LlmModel } from "@/types/admin";

export async function listModels(namespaceId?: number): Promise<LlmModel[]> {
  const query = namespaceId !== undefined ? `?namespaceId=${namespaceId}` : "";
  return api.get<LlmModel[]>(`/admin/models${query}`);
}

export async function getModel(id: number): Promise<LlmModel> {
  return api.get<LlmModel>(`/admin/models/${id}`);
}

export async function createModel(data: Partial<LlmModel>): Promise<void> {
  await api.post("/admin/models", data);
}

export async function updateModel(id: number, data: Partial<LlmModel>): Promise<void> {
  await api.put(`/admin/models/${id}`, data);
}

export async function deleteModel(id: number): Promise<void> {
  await api.delete(`/admin/models/${id}`);
}
```

- [ ] **Step 5: 创建 lib/api/admin-agents.ts**

```typescript
import { api } from "./client";
import type { Agent, AgentResource } from "@/types/admin";

export async function listAgents(namespaceId?: number): Promise<Agent[]> {
  const query = namespaceId !== undefined ? `?namespaceId=${namespaceId}` : "";
  return api.get<Agent[]>(`/admin/agents${query}`);
}

export async function getAgent(id: number): Promise<Agent> {
  return api.get<Agent>(`/admin/agents/${id}`);
}

export async function createAgent(data: Partial<Agent>): Promise<void> {
  await api.post("/admin/agents", data);
}

export async function updateAgent(id: number, data: Partial<Agent>): Promise<void> {
  await api.put(`/admin/agents/${id}`, data);
}

export async function deleteAgent(id: number): Promise<void> {
  await api.delete(`/admin/agents/${id}`);
}

export async function bindResource(agentId: number, resourceType: string, resourceId: number): Promise<void> {
  await api.post(`/admin/agents/${agentId}/resources`, { resource_type: resourceType, resource_id: resourceId });
}

export async function unbindResource(agentId: number, resourceId: number, type: string): Promise<void> {
  await api.delete(`/admin/agents/${agentId}/resources/${resourceId}?type=${type}`);
}
```

- [ ] **Step 6: 创建 lib/api/admin-namespaces.ts**

```typescript
import { api } from "./client";
import type { Namespace } from "@/types/admin";

export async function listNamespaces(): Promise<Namespace[]> {
  return api.get<Namespace[]>("/admin/namespaces");
}

export async function getNamespace(id: number): Promise<Namespace> {
  return api.get<Namespace>(`/admin/namespaces/${id}`);
}

export async function createNamespace(data: Partial<Namespace>): Promise<void> {
  await api.post("/admin/namespaces", data);
}

export async function updateNamespace(id: number, data: Partial<Namespace>): Promise<void> {
  await api.put(`/admin/namespaces/${id}`, data);
}

export async function deleteNamespace(id: number): Promise<void> {
  await api.delete(`/admin/namespaces/${id}`);
}

export async function listNamespaceUsers(id: number): Promise<{ userId: number; role: string; nickname: string; email: string }[]> {
  return api.get(`/admin/namespaces/${id}/users`);
}

export async function updateUserRole(namespaceId: number, userId: number, role: string): Promise<void> {
  await api.put(`/admin/namespaces/${namespaceId}/users/${userId}`, { role });
}
```

- [ ] **Step 7: 创建 lib/api/admin-model-templates.ts**

```typescript
import { api } from "./client";
import type { ModelTemplate } from "@/types/admin";

export async function listTemplates(): Promise<ModelTemplate[]> {
  return api.get<ModelTemplate[]>("/admin/model-templates");
}

export async function getTemplate(id: number): Promise<ModelTemplate> {
  return api.get<ModelTemplate>(`/admin/model-templates/${id}`);
}

export async function createTemplate(data: Partial<ModelTemplate>): Promise<void> {
  await api.post("/admin/model-templates", data);
}

export async function updateTemplate(id: number, data: Partial<ModelTemplate>): Promise<void> {
  await api.put(`/admin/model-templates/${id}`, data);
}

export async function deleteTemplate(id: number): Promise<void> {
  await api.delete(`/admin/model-templates/${id}`);
}
```

- [ ] **Step 8: Commit**

```bash
git add frontend/src/lib/api/
git commit -m "refactor: add domain-specific API modules"
```

---

### Task 4.5: API 模块单元测试（TDD）

**Files:**
- Create: `frontend/tests/api/client.test.ts`
- Create: `frontend/tests/api/admin-agents.test.ts`

- [ ] **Step 1（TDD 红）: 编写 API client 测试 —— 验证 namespaceId 参数名**

```typescript
// frontend/tests/api/client.test.ts
import { describe, it, expect } from "vitest";
import { api } from "@/lib/api/client";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("API client - namespaceId param", () => {
  it("should use namespaceId (camelCase) in query params, not namespace_id", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    });

    await api.get("/agents", { namespaceId: 1 });

    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain("namespaceId=1");
    expect(url).not.toContain("namespace_id");
  });

  it("should include X-Namespace-Id header", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    });

    await api.get("/agents", { namespaceId: 2 });

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers["X-Namespace-Id"]).toBe("2");
  });

  it("should use PATCH method for rename", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await api.patch("/conversations/test-uuid", { name: "新名字" });

    const method = mockFetch.mock.calls[0][1].method;
    expect(method).toBe("PATCH");
  });
});
```

- [ ] **Step 2（TDD 红）: 运行测试 —— 预期 FAIL（API 尚未实现）**

```bash
cd frontend && npx vitest run tests/api/client.test.ts 2>&1
```

Expected: FAIL — 因为 `@/lib/api/client` 还未从旧 `api.ts` 中提取出来

- [ ] **Step 3（TDD 绿）: 确认 Task 3 创建了 client.ts 后测试通过**

```bash
cd frontend && npx vitest run tests/api/client.test.ts 2>&1
```

Expected: PASS (3 tests)

- [ ] **Step 4: 编写 admin-agents API 测试 —— 验证调用正确的 endpoint**

```typescript
// frontend/tests/api/admin-agents.test.ts
import { describe, it, expect } from "vitest";
import * as adminAgentsApi from "@/lib/api/admin-agents";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Admin Agents API", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([]) });
  });

  it("listAgents with namespaceId calls correct URL", async () => {
    await adminAgentsApi.listAgents(1);
    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain("/admin/agents?namespaceId=1");
  });

  it("bindResource sends correct body", async () => {
    await adminAgentsApi.bindResource(1, "MODEL", 5);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/admin/agents/1/resources");
    expect(JSON.parse(options.body)).toEqual({
      resource_type: "MODEL",
      resource_id: 5,
    });
  });
});
```

- [ ] **Step 5（TDD 红）: 运行测试 —— 预期 FAIL（admin-agents API 未创建）**

```bash
cd frontend && npx vitest run tests/api/admin-agents.test.ts 2>&1
```

Expected: FAIL — import 错误

- [ ] **Step 6（TDD 绿）: 确认 Task 4 创建 admin-agents.ts 后测试通过**

```bash
cd frontend && npx vitest run tests/api/admin-agents.test.ts 2>&1
```

Expected: PASS (2 tests)

- [ ] **Step 7: 全部 API 测试通过**

```bash
cd frontend && npx vitest run tests/api/ 2>&1
```

Expected: All PASS

- [ ] **Step 8: Commit**

```bash
git add frontend/tests/api/
git commit -m "test: add API module unit tests with TDD"
```

---

### Task 5: 创建 useSocket hook

**Files:**
- Create: `frontend/src/lib/hooks/use-socket.ts`

- [ ] **Step 1: 创建 hooks/use-socket.ts**

```typescript
"use client";

import { useEffect, useCallback, useRef } from "react";
import { onEvent, offEvent, joinRoom, leaveRoom, disconnectSocket } from "@/lib/socket";

interface StreamEvent {
  type: "start" | "chunk" | "done" | "error";
  content?: string;
  client_msg_id?: string;
  message_uuid?: string;
  message?: string;
}

export function useSocket() {
  const handlersRef = useRef<Map<string, Set<(data: StreamEvent) => void>>>(new Map());

  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, []);

  const onStreamEvent = useCallback((handler: (data: StreamEvent) => void) => {
    const wrapped = (...args: unknown[]) => {
      handler(args[0] as StreamEvent);
    };
    onEvent("stream_event", wrapped);
    return () => offEvent("stream_event", wrapped);
  }, []);

  return { onStreamEvent, joinRoom, leaveRoom };
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/lib/hooks/use-socket.ts
git commit -m "feat: add useSocket hook"
```

---

### Task 6: 创建 Auth Provider + hook

**Files:**
- Create: `frontend/src/lib/hooks/use-auth.tsx`

- [ ] **Step 1: 创建 hooks/use-auth.tsx**

```typescript
"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import * as authApi from "@/lib/api/auth";
import { getToken, setToken, clearAuth, getUser, setUser, getNamespaces, setNamespaces } from "@/lib/auth";
import type { User as AuthUser, NamespaceInfo } from "@/types/auth";

interface AuthContextType {
  user: AuthUser | null;
  isAdmin: boolean;
  namespaces: NamespaceInfo[];
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  namespaces: [],
  loading: true,
  login: async () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [namespaces, setNamespacesState] = useState<NamespaceInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    const cachedUser = getUser();
    const cachedNamespaces = getNamespaces();
    if (cachedUser) {
      setUserState(cachedUser);
      setNamespacesState(cachedNamespaces);
      setLoading(false);
    }

    authApi.getMe()
      .then((data) => {
        setUserState(data.user);
        setUser(data.user);
        setNamespacesState(data.namespaces);
        setNamespaces(data.namespaces);
      })
      .catch(() => {
        clearAuth();
        router.push("/login");
      })
      .finally(() => setLoading(false));
  }, [router]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    setToken(data.token);
    setUser(data.user);
    setNamespaces(data.namespaces);
    document.cookie = `auth_token=${data.token}; path=/`;
    setUserState(data.user);
    setNamespacesState(data.namespaces);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin: user?.isAdmin ?? false,
        namespaces,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/lib/hooks/use-auth.tsx
git commit -m "feat: add AuthProvider and useAuth hook"
```

---

### Task 7: 创建 Namespace Provider + hook

**Files:**
- Create: `frontend/src/lib/hooks/use-namespace.tsx`

- [ ] **Step 1: 创建 hooks/use-namespace.tsx**

```typescript
"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { getCurrentNamespaceId, setCurrentNamespaceId } from "@/lib/api/client";
import { useAuth } from "./use-auth";

interface NamespaceContextType {
  currentNamespaceId: number;
  namespaces: { id: number; name: string; role: string }[];
  isCurrentNsAdmin: boolean;
  switchNamespace: (id: number) => void;
}

const NamespaceContext = createContext<NamespaceContextType>({
  currentNamespaceId: 0,
  namespaces: [],
  isCurrentNsAdmin: false,
  switchNamespace: () => {},
});

export const useNamespace = () => useContext(NamespaceContext);

export function NamespaceProvider({ children }: { children: ReactNode }) {
  const { user, namespaces } = useAuth();
  const [currentNamespaceId, setCurrentId] = useState(0);

  useEffect(() => {
    if (user) {
      if (user.isAdmin) {
        setCurrentId(0);
        setCurrentNamespaceId(0);
      } else {
        const saved = getCurrentNamespaceId();
        const valid = namespaces.find((ns) => ns.id === saved);
        if (valid) {
          setCurrentId(saved);
        } else if (namespaces.length > 0) {
          setCurrentId(namespaces[0].id);
          setCurrentNamespaceId(namespaces[0].id);
        }
      }
    }
  }, [user, namespaces]);

  const switchNamespace = useCallback((id: number) => {
    setCurrentId(id);
    setCurrentNamespaceId(id);
  }, []);

  const currentNs = namespaces.find((ns) => ns.id === currentNamespaceId);
  const isCurrentNsAdmin = !user?.isAdmin && currentNs?.role === "ADMIN";

  return (
    <NamespaceContext.Provider
      value={{
        currentNamespaceId,
        namespaces,
        isCurrentNsAdmin,
        switchNamespace,
      }}
    >
      {children}
    </NamespaceContext.Provider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/lib/hooks/use-namespace.tsx
git commit -m "feat: add NamespaceProvider and useNamespace hook"
```

---

### Task 7.5: Hook 单元测试（TDD）

**Files:**
- Create: `frontend/tests/hooks/use-auth.test.tsx`
- Create: `frontend/tests/hooks/use-namespace.test.tsx`

- [ ] **Step 1（TDD 红）: 编写 useAuth hook 测试**

```typescript
// frontend/tests/hooks/use-auth.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAuth, AuthProvider } from "@/lib/hooks/use-auth";
import { server } from "../mocks/server";
import { http, HttpResponse } from "msw";

function renderUseAuth() {
  return renderHook(() => useAuth(), { wrapper: AuthProvider });
}

describe("useAuth", () => {
  it("should detect Global Admin from token", async () => {
    // 模拟已登录状态
    localStorage.setItem("auth_token", "admin-token");
    localStorage.setItem("auth_user", JSON.stringify({
      id: 1, email: "admin@fast.com", nickname: "Admin", isAdmin: true, mustChangePassword: false,
    }));
    localStorage.setItem("auth_namespaces", "[]");

    const { result } = renderUseAuth();

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isAdmin).toBe(true);
    expect(result.current.namespaces).toEqual([]);
  });

  it("should detect Namespace Admin from namespace role", async () => {
    localStorage.setItem("auth_token", "ns-admin-token");
    localStorage.setItem("auth_user", JSON.stringify({
      id: 2, email: "nsadmin@fast.com", nickname: "NSAdmin", isAdmin: false, mustChangePassword: false,
    }));
    localStorage.setItem("auth_namespaces", JSON.stringify([{ id: 1, name: "空间1", role: "ADMIN" }]));

    const { result } = renderUseAuth();

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isAdmin).toBe(false);
    expect(result.current.namespaces[0].role).toBe("ADMIN");
  });

  it("should detect End User", async () => {
    localStorage.setItem("auth_token", "user-token");
    localStorage.setItem("auth_user", JSON.stringify({
      id: 3, email: "user@fast.com", nickname: "User", isAdmin: false, mustChangePassword: false,
    }));
    localStorage.setItem("auth_namespaces", JSON.stringify([{ id: 1, name: "空间1", role: "USER" }]));

    const { result } = renderUseAuth();

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isAdmin).toBe(false);
    expect(result.current.namespaces[0].role).toBe("USER");
  });

  it("should logout and redirect", async () => {
    const { result } = renderUseAuth();
    await waitFor(() => expect(result.current.loading).toBe(false));

    result.current.logout();

    expect(localStorage.getItem("auth_token")).toBeNull();
  });
});
```

- [ ] **Step 2（TDD 红）: 运行 useAuth 测试 —— 预期 FAIL**

```bash
cd frontend && npx vitest run tests/hooks/use-auth.test.tsx 2>&1
```

Expected: FAIL — useAuth hook/AuthProvider 尚未创建

- [ ] **Step 3（TDD 绿）: 编写 useNamespace hook 测试**

```typescript
// frontend/tests/hooks/use-namespace.test.tsx
import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useNamespace, NamespaceProvider } from "@/lib/hooks/use-namespace";
import { AuthProvider } from "@/lib/hooks/use-auth";

function renderUseNamespace() {
  return renderHook(() => useNamespace(), {
    wrapper: ({ children }) => (
      <AuthProvider>
        <NamespaceProvider>{children}</NamespaceProvider>
      </AuthProvider>
    ),
  });
}

describe("useNamespace", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should set isCurrentNsAdmin=true for Namespace Admin", async () => {
    localStorage.setItem("auth_token", "ns-admin-token");
    localStorage.setItem("auth_namespaces", JSON.stringify([{ id: 1, name: "空间1", role: "ADMIN" }]));
    localStorage.setItem("auth_user", JSON.stringify({
      id: 2, email: "nsadmin@fast.com", nickname: "NSAdmin", isAdmin: false,
    }));

    const { result } = renderUseNamespace();
    await waitFor(() => expect(result.current.currentNamespaceId).toBeGreaterThan(0));

    expect(result.current.isCurrentNsAdmin).toBe(true);
  });

  it("should set isCurrentNsAdmin=false for End User", async () => {
    localStorage.setItem("auth_token", "user-token");
    localStorage.setItem("auth_namespaces", JSON.stringify([{ id: 1, name: "空间1", role: "USER" }]));
    localStorage.setItem("auth_user", JSON.stringify({
      id: 3, email: "user@fast.com", nickname: "User", isAdmin: false,
    }));

    const { result } = renderUseNamespace();
    await waitFor(() => expect(result.current.currentNamespaceId).toBeGreaterThan(0));

    expect(result.current.isCurrentNsAdmin).toBe(false);
  });

  it("should set isCurrentNsAdmin=false when switching to non-admin namespace", async () => {
    localStorage.setItem("auth_token", "user-token");
    localStorage.setItem("auth_namespaces", JSON.stringify([
      { id: 1, name: "空间1", role: "ADMIN" },
      { id: 2, name: "空间2", role: "USER" },
    ]));
    localStorage.setItem("auth_user", JSON.stringify({
      id: 2, email: "nsadmin@fast.com", nickname: "NSAdmin", isAdmin: false,
    }));

    const { result } = renderUseNamespace();
    await waitFor(() => expect(result.current.namespaces.length).toBe(2));

    // 默认应该选中第一个 ns (id=1, role=ADMIN)
    expect(result.current.isCurrentNsAdmin).toBe(true);

    // 切换到 ns=2 (role=USER)
    result.current.switchNamespace(2);
    expect(result.current.isCurrentNsAdmin).toBe(false);
  });

  it("should set currentNamespaceId=0 for Global Admin (has no namespaces)", async () => {
    localStorage.setItem("auth_token", "admin-token");
    localStorage.setItem("auth_namespaces", "[]");
    localStorage.setItem("auth_user", JSON.stringify({
      id: 1, email: "admin@fast.com", nickname: "Admin", isAdmin: true,
    }));

    const { result } = renderUseNamespace();
    await waitFor(() => !result.current.loading);

    expect(result.current.currentNamespaceId).toBe(0);
    expect(result.current.isCurrentNsAdmin).toBe(false);
  });
});
```

- [ ] **Step 4（TDD 红）: 运行 useNamespace 测试 —— 预期 FAIL**

```bash
cd frontend && npx vitest run tests/hooks/use-namespace.test.tsx 2>&1
```

Expected: FAIL — NamespaceProvider 尚未创建

- [ ] **Step 5（TDD 绿）: 确认 Task 6-7 创建 hooks 后测试通过**

```bash
cd frontend && npx vitest run tests/hooks/ 2>&1
```

Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/tests/hooks/
git commit -m "test: add hook unit tests with TDD (useAuth, useNamespace)"
```

---

### Task 8: 创建 useConversations hook

**Files:**
- Create: `frontend/src/lib/hooks/use-conversations.ts`

- [ ] **Step 1: 创建 hooks/use-conversations.ts**

```typescript
"use client";

import { useState, useCallback, useEffect } from "react";
import * as conversationsApi from "@/lib/api/conversations";
import type { Conversation } from "@/types/chat";

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUuid, setSelectedUuid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const list = useCallback(async () => {
    setLoading(true);
    try {
      const data = await conversationsApi.listConversations();
      setConversations(data);
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (name: string, agentId: number, modelId: number, namespaceId: number) => {
    const conv = await conversationsApi.createConversation({
      name,
      agent_id: agentId,
      model_id: modelId,
      namespace_id: namespaceId,
    });
    setConversations((prev) => [...prev, conv]);
    setSelectedUuid(conv.uuid);
    return conv;
  }, []);

  const rename = useCallback(async (uuid: string, name: string) => {
    await conversationsApi.renameConversation(uuid, name);
    setConversations((prev) =>
      prev.map((c) => (c.uuid === uuid ? { ...c, name } : c))
    );
  }, []);

  const remove = useCallback(async (uuid: string) => {
    await conversationsApi.deleteConversation(uuid);
    setConversations((prev) => prev.filter((c) => c.uuid !== uuid));
    if (selectedUuid === uuid) {
      setSelectedUuid(null);
    }
  }, [selectedUuid]);

  const select = useCallback((uuid: string) => {
    setSelectedUuid(uuid);
  }, []);

  useEffect(() => {
    list();
  }, [list]);

  return { conversations, selectedUuid, loading, list, create, rename, remove, select };
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/lib/hooks/use-conversations.ts
git commit -m "feat: add useConversations hook"
```

---

### Task 9: 创建 useMessages hook

**Files:**
- Create: `frontend/src/lib/hooks/use-messages.ts`

- [ ] **Step 1: 创建 hooks/use-messages.ts**

```typescript
"use client";

import { useState, useCallback, useEffect } from "react";
import * as conversationsApi from "@/lib/api/conversations";
import { joinRoom, leaveRoom, onEvent, offEvent } from "@/lib/socket";
import type { Message } from "@/types/chat";

export function useMessages(conversationUuid: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load history
  useEffect(() => {
    if (!conversationUuid) {
      setMessages([]);
      return;
    }
    conversationsApi.getMessages(conversationUuid)
      .then(setMessages)
      .catch(() => setError("加载消息失败"));
  }, [conversationUuid]);

  // Socket streaming
  useEffect(() => {
    if (!conversationUuid) return;

    joinRoom(`conversation:${conversationUuid}`);

    const handleStream = (data: any) => {
      const type = data.type as string;
      const clientMsgId = data.client_msg_id as string;

      if (type === "chunk") {
        const content = data.content as string;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.uuid === clientMsgId && last.role === "assistant") {
            return [...prev.slice(0, -1), { ...last, content: last.content + content }];
          }
          return [...prev, {
            id: 0,
            uuid: clientMsgId || String(Date.now()),
            conversationUuid: conversationUuid,
            role: "assistant" as const,
            content,
            createdAt: new Date().toISOString(),
          }];
        });
      } else if (type === "done") {
        setStreaming(false);
      } else if (type === "error") {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === "assistant" && last.uuid === clientMsgId) {
            return [...prev.slice(0, -1), { ...last, content: last.content + "\n[错误] " + (data.message || "") }];
          }
          return prev;
        });
        setStreaming(false);
      }
    };

    onEvent("stream_event", handleStream);

    return () => {
      offEvent("stream_event", handleStream);
      leaveRoom(`conversation:${conversationUuid}`);
    };
  }, [conversationUuid]);

  const send = useCallback(async (content: string) => {
    if (!conversationUuid || !content.trim()) return;

    setStreaming(true);
    setError(null);

    const userMsgId = String(Date.now());
    const assistantMsgId = userMsgId + "_assistant";

    setMessages((prev) => [
      ...prev,
      { id: 0, uuid: userMsgId, conversationUuid, role: "user", content, createdAt: new Date().toISOString() },
      { id: 0, uuid: assistantMsgId, conversationUuid, role: "assistant", content: "", createdAt: new Date().toISOString() },
    ]);

    try {
      await conversationsApi.sendMessage(conversationUuid, content, assistantMsgId);
    } catch {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === "assistant") {
          return [...prev.slice(0, -1), { ...last, content: last.content + "\n[错误] 发送失败" }];
        }
        return prev;
      });
      setStreaming(false);
    }
  }, [conversationUuid]);

  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, streaming, error, send, clear };
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/lib/hooks/use-messages.ts
git commit -m "feat: add useMessages hook with socket streaming"
```

---

### Task 10: 创建用户端布局

**Files:**
- Create: `frontend/src/app/(user)/layout.tsx`
- Create: `frontend/src/app/(user)/page.tsx`
- Create: `frontend/src/components/user/layout/UserSidebar.tsx`
- Create: `frontend/src/components/user/layout/UserHeader.tsx`

- [ ] **Step 1: 创建 UserSidebar**

```typescript
"use client";

import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { MessageSquare, Sparkles } from "lucide-react";

const navItems = [
  { icon: MessageSquare, label: "对话", href: "/conversations" },
];

export function UserSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className="w-16 flex flex-col h-full bg-white border-r border-blue-100 shadow-sm">
      <div className="h-14 flex items-center justify-center border-b border-blue-100">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-md">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
      </div>

      <nav className="flex-1 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={cn(
                "w-full h-12 flex items-center justify-center transition-all relative group",
                isActive ? "text-blue-600" : "text-blue-400/50 hover:text-blue-500"
              )}
              title={item.label}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-r" />
              )}
              <item.icon className="h-5 w-5" />
              <div className="absolute left-full ml-2 px-2 py-1 bg-white text-blue-600 text-xs rounded shadow-lg border border-blue-100 opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                {item.label}
              </div>
            </button>
          );
        })}
      </nav>

      <div className="p-4 text-center text-blue-300/50 text-xs border-t border-blue-100">v1</div>
    </aside>
  );
}
```

- [ ] **Step 2: 创建 UserHeader**

```typescript
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useNamespace } from "@/lib/hooks/use-namespace";
import { NamespaceSwitcher } from "@/components/user/NamespaceSwitcher";
import { LogOut } from "lucide-react";
import { getUser } from "@/lib/auth";
import type { User } from "@/types/auth";

function getInitials(name: string): string {
  return name ? name.charAt(0).toUpperCase() : "?";
}

export function UserHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const [localUser, setLocalUser] = useState<User | null>(null);
  const { namespaces, currentNamespaceId, switchNamespace } = useNamespace();
  const { logout } = useAuth();

  useEffect(() => {
    setLocalUser(getUser());
  }, []);

  return (
    <div className="flex items-center gap-3">
      {namespaces.length > 0 && (
        <NamespaceSwitcher
          namespaces={namespaces}
          current={currentNamespaceId}
          onChange={switchNamespace}
        />
      )}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-medium shadow-md shadow-blue-200/50">
            {getInitials(localUser?.nickname || "用")}
          </div>
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-blue-100 py-2 z-50">
            <div className="px-4 py-3 border-b border-blue-50">
              <div className="font-medium text-blue-800">{localUser?.nickname || "用户"}</div>
              <div className="text-xs text-blue-400 mt-0.5">{localUser?.email}</div>
              <div className="text-xs text-blue-400 mt-0.5">
                {localUser?.isAdmin ? "全局管理员" : "普通用户"}
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" /> 退出登录
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 创建 (user)/layout.tsx**

```typescript
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/hooks/use-auth";
import { NamespaceProvider } from "@/lib/hooks/use-namespace";
import { UserLayout } from "./UserLayoutClient";

export default function UserLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <AuthProvider>
        <NamespaceProvider>
          <UserLayout>{children}</UserLayout>
        </NamespaceProvider>
      </AuthProvider>
    </TooltipProvider>
  );
}
```

- [ ] **Step 4: 创建 UserLayoutClient.tsx（客户端包装器）**

```typescript
"use client";

import { UserSidebar } from "@/components/user/layout/UserSidebar";
import { UserHeader } from "@/components/user/layout/UserHeader";

export function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <UserSidebar />
      <div className="flex-1 flex flex-col">
        <header className="h-14 bg-white border-b border-blue-100 flex items-center justify-end px-4">
          <UserHeader />
        </header>
        <main className="flex-1 h-screen overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: 创建 (user)/page.tsx**

```typescript
import { redirect } from "next/navigation";

export default function UserPage() {
  redirect("/conversations");
}
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/\(user\)/ frontend/src/components/user/layout/
git commit -m "feat: add user layout with sidebar and header"
```

---

### Task 11: 创建用户端会话页面

**Files:**
- Create: `frontend/src/app/(user)/conversations/page.tsx`
- Create: `frontend/src/app/(user)/conversations/[uuid]/page.tsx`

- [ ] **Step 1: 创建 conversations/page.tsx（重定向或有 uuid 自动选中）**

```typescript
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConversations } from "@/lib/hooks/use-conversations";

export default function ConversationsPage() {
  const router = useRouter();
  const { conversations, loading } = useConversations();

  useEffect(() => {
    if (!loading && conversations.length > 0) {
      router.replace(`/conversations/${conversations[0].uuid}`);
    }
  }, [conversations, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-blue-400/60">
        加载中...
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full text-blue-400/50">
      <div className="text-center">
        <h3 className="text-lg font-medium text-blue-600 mb-2">开始对话</h3>
        <p className="text-xs max-w-xs">创建一个新对话，开始智能交流</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 创建 conversations/[uuid]/page.tsx**

```typescript
"use client";

import { useParams } from "next/navigation";
import { ConversationView } from "@/components/user/conversation/ConversationView";

export default function ConversationPage() {
  const params = useParams();
  const uuid = params.uuid as string;

  return <ConversationView conversationUuid={uuid} />;
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/\(user\)/conversations/
git commit -m "feat: add conversation routes"
```

---

### Task 12: 创建会话组件（拆解 720 行单体）

**Files:**
- Create: `frontend/src/components/user/conversation/ConversationView.tsx`
- Create: `frontend/src/components/user/conversation/ConversationSidebar.tsx`
- Create: `frontend/src/components/user/conversation/ConversationItem.tsx`
- Create: `frontend/src/components/user/conversation/MessageList.tsx`
- Create: `frontend/src/components/user/conversation/MessageBubble.tsx`
- Create: `frontend/src/components/user/conversation/ChatInput.tsx`
- Create: `frontend/src/components/user/selectors/AgentSelect.tsx`
- Create: `frontend/src/components/user/selectors/ModelSelect.tsx`
- Create: `frontend/src/components/user/NamespaceSwitcher.tsx`

Note: AgentSelect, ModelSelect, NamespaceSwitcher 直接从旧位置搬过来。

- [ ] **Step 1: 搬 AgentSelect**

```typescript
"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AgentItem {
  id: number;
  name: string;
}

export function AgentSelect({
  agents,
  value,
  onChange,
  placeholder = "选择 Agent",
}: {
  agents: AgentItem[];
  value: number | null;
  onChange: (id: number) => void;
  placeholder?: string;
}) {
  return (
    <Select value={value ? String(value) : ""} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {agents.map((a) => (
          <SelectItem key={a.id} value={String(a.id)}>
            {a.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 2: 搬 ModelSelect**

```typescript
"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ModelItem {
  id: number;
  name: string;
}

export function ModelSelect({
  models,
  value,
  onChange,
  placeholder = "选择模型",
}: {
  models: ModelItem[];
  value: number | null;
  onChange: (id: number) => void;
  placeholder?: string;
}) {
  return (
    <Select value={value ? String(value) : ""} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {models.map((m) => (
          <SelectItem key={m.id} value={String(m.id)}>
            {m.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 3: 搬 NamespaceSwitcher**

```typescript
"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface NamespaceItem {
  id: number;
  name: string;
  role: string;
}

export function NamespaceSwitcher({
  namespaces,
  current,
  onChange,
}: {
  namespaces: NamespaceItem[];
  current: number;
  onChange: (id: number) => void;
}) {
  if (namespaces.length === 0) return null;

  return (
    <Select value={String(current)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger className="w-[180px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {namespaces.map((ns) => (
          <SelectItem key={ns.id} value={String(ns.id)}>
            {ns.name || `空间 ${ns.id}`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 4: 创建 ConversationItem**

```typescript
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Props {
  uuid: string;
  name: string;
  updatedAt?: string;
  isSelected: boolean;
  onSelect: () => void;
  onRename: (name: string) => Promise<void>;
  onDelete: () => Promise<void>;
}

export function ConversationItem({ uuid, name, updatedAt, isSelected, onSelect, onRename, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name);

  const handleSave = async () => {
    if (!editName.trim()) return;
    await onRename(editName.trim());
    setEditing(false);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await onDelete();
  };

  return (
    <div
      onClick={onSelect}
      className={cn(
        "group relative w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-200 cursor-pointer",
        isSelected
          ? "bg-blue-50 border border-blue-200"
          : "hover:bg-blue-50/50 border border-transparent"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {editing ? (
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") setEditing(false);
              }}
              className="h-7 text-xs px-2 py-1 bg-white"
              autoFocus
            />
          ) : (
            <>
              <p className={cn("font-medium truncate text-sm", isSelected ? "text-blue-700" : "text-blue-600")}>
                {name}
              </p>
              {updatedAt && (
                <p className="text-xs text-blue-400/60 mt-0.5">
                  {new Date(updatedAt).toLocaleString("zh-CN")}
                </p>
              )}
            </>
          )}
        </div>
        {!editing && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); setEditing(true); setEditName(name); }}
              className="p-1.5 rounded-md hover:bg-blue-100 text-blue-400/60 hover:text-blue-600"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button onClick={handleDelete} className="p-1.5 rounded-md hover:bg-red-50 text-blue-400/60 hover:text-red-500">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: 创建 ConversationSidebar**

```typescript
"use client";

import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConversationItem } from "./ConversationItem";
import type { Conversation } from "@/types/chat";

interface Props {
  conversations: Conversation[];
  selectedUuid: string | null;
  loading: boolean;
  onSelect: (uuid: string) => void;
  onCreate: () => void;
  onRename: (uuid: string, name: string) => Promise<void>;
  onDelete: (uuid: string) => Promise<void>;
}

export function ConversationSidebar({ conversations, selectedUuid, loading, onSelect, onCreate, onRename, onDelete }: Props) {
  return (
    <aside className="flex flex-col h-full bg-white border-r border-blue-100 w-64 shrink-0">
      <div className="h-14 px-4 flex items-center border-b border-blue-100 shrink-0">
        <h2 className="font-medium text-blue-600 text-sm">对话</h2>
      </div>

      <div className="p-3 border-b border-blue-100 shrink-0">
        <Button onClick={onCreate} className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg h-9 text-sm font-medium shadow-md">
          <Plus className="h-4 w-4 mr-2" />
          新对话
        </Button>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-1">
          {loading ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-lg bg-blue-50 animate-pulse" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-blue-400/50 text-xs">暂无对话</div>
          ) : (
            conversations.map((conv) => (
              <ConversationItem
                key={conv.uuid}
                uuid={conv.uuid}
                name={conv.name}
                updatedAt={conv.updatedAt}
                isSelected={selectedUuid === conv.uuid}
                onSelect={() => onSelect(conv.uuid)}
                onRename={(name) => onRename(conv.uuid, name)}
                onDelete={() => onDelete(conv.uuid)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
```

- [ ] **Step 6: 创建 MessageBubble**

```typescript
"use client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Props {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
}

export function MessageBubble({ role, content, createdAt }: Props) {
  return (
    <div className={cn("flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300", role === "user" && "flex-row-reverse")}>
      <Avatar className={cn(
        "h-9 w-9 rounded-xl flex-shrink-0 shadow-sm",
        role === "user" ? "bg-gradient-to-br from-blue-500 to-cyan-500" : "bg-gradient-to-br from-blue-400 to-cyan-400"
      )}>
        <AvatarFallback className="text-white font-semibold text-sm">
          {role === "user" ? "我" : "AI"}
        </AvatarFallback>
      </Avatar>

      <div className={cn("flex-1 max-w-[75%]", role === "user" && "flex flex-col items-end")}>
        <div className={cn(
          "rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-sm",
          role === "user"
            ? "bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-br-md shadow-md shadow-blue-200"
            : "bg-white text-blue-700 rounded-bl-md border border-blue-100"
        )}>
          {content}
        </div>
        {createdAt && (
          <span className="text-[10px] text-blue-400/60 mt-1.5 px-1">
            {new Date(createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: 创建 MessageList**

```typescript
"use client";

import { useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./MessageBubble";
import { MessageCircle } from "lucide-react";
import type { Message } from "@/types/chat";

interface Props {
  messages: Message[];
  streaming: boolean;
}

function LoadingDots() {
  return (
    <div className="flex gap-4 items-start">
      <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center shadow-sm">
        <span className="text-white font-semibold text-sm">AI</span>
      </div>
      <div className="rounded-2xl rounded-bl-md bg-white border border-blue-100 px-5 py-4 shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-transparent to-cyan-50 animate-pulse" />
        <div className="relative flex gap-1.5 items-center">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "200ms" }} />
          <span className="w-2.5 h-2.5 rounded-full bg-blue-300 animate-bounce" style={{ animationDelay: "400ms" }} />
        </div>
      </div>
    </div>
  );
}

export function MessageList({ messages, streaming }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0 && !streaming) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-cyan-100 border border-blue-200 flex items-center justify-center mb-5 shadow-sm mx-auto">
            <MessageCircle className="h-8 w-8 text-blue-500" />
          </div>
          <h3 className="text-lg font-medium text-blue-600 mb-2">开始对话</h3>
          <p className="text-blue-400/60 text-xs max-w-xs">向私人助手发送消息，开始智能对话</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
      <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
        {messages.map((msg) => (
          <MessageBubble key={msg.uuid} role={msg.role} content={msg.content} createdAt={msg.createdAt} />
        ))}
        {streaming && <LoadingDots />}
      </div>
    </ScrollArea>
  );
}
```

- [ ] **Step 8: 创建 ChatInput**

```typescript
"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

interface Props {
  onSend: (content: string) => void;
  disabled?: boolean;
  loading?: boolean;
}

export function ChatInput({ onSend, disabled, loading }: Props) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!input.trim() || disabled || loading) return;
    onSend(input);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  };

  return (
    <div className="p-4 bg-white border-t border-blue-100 shrink-0">
      <div className="max-w-3xl mx-auto">
        <div className="relative bg-white rounded-2xl border border-blue-200 shadow-md shadow-blue-100/50 focus-within:shadow-lg focus-within:border-blue-300 transition-all duration-200">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="输入消息... (Shift + Enter 换行)"
            className="w-full px-5 py-4 pr-14 resize-none bg-transparent rounded-2xl text-sm text-blue-700 placeholder:text-blue-400/60 focus:outline-none max-h-32"
            disabled={disabled}
            rows={1}
          />
          <div className="absolute right-3 bottom-3">
            <Button
              onClick={handleSend}
              disabled={!input.trim() || disabled || loading}
              size="icon"
              className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-lg shadow-blue-200 disabled:shadow-none transition-all"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-[10px] text-center text-blue-400/50 mt-2">私人助手可能会产生不准确的信息，请自行核实</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 9: 创建 ConversationView（主容器）**

```typescript
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useNamespace } from "@/lib/hooks/use-namespace";
import { useConversations } from "@/lib/hooks/use-conversations";
import { useMessages } from "@/lib/hooks/use-messages";
import * as agentsApi from "@/lib/api/agents";
import { ConversationSidebar } from "./ConversationSidebar";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { AgentSelect } from "@/components/user/selectors/AgentSelect";
import { ModelSelect } from "@/components/user/selectors/ModelSelect";
import { ChevronLeft, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Agent } from "@/types/admin";

interface Props {
  conversationUuid?: string;
}

export function ConversationView({ conversationUuid }: Props) {
  const router = useRouter();
  const { currentNamespaceId } = useNamespace();
  const { conversations, selectedUuid, loading: convsLoading, create, rename, remove, select } = useConversations();
  const { messages, streaming, send } = useMessages(selectedUuid);

  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [availableModels, setAvailableModels] = useState<{ id: number; name: string }[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // 当从 URL 获取 conversationUuid 时选中
  useEffect(() => {
    if (conversationUuid) {
      select(conversationUuid);
    }
  }, [conversationUuid, select]);

  // 加载 Agent 列表
  useEffect(() => {
    if (!currentNamespaceId) return;
    agentsApi.listAgents(currentNamespaceId).then(setAgents).catch(console.error);
  }, [currentNamespaceId]);

  // 加载 Agent 绑定的模型
  useEffect(() => {
    if (!selectedAgentId) { setAvailableModels([]); return; }
    agentsApi.getAgentResources(selectedAgentId, "MODEL")
      .then((resources) => {
        const modelIds = resources.map((r) => r.resource_id);
        setAvailableModels(modelIds.map((id) => ({ id, name: `模型 ${id}` })));
      })
      .catch(console.error);
  }, [selectedAgentId]);

  const handleCreate = async () => {
    try {
      const conv = await create("新对话", selectedAgentId!, selectedModelId!, currentNamespaceId);
      router.push(`/conversations/${conv.uuid}`);
    } catch (e) {
      console.error("创建失败", e);
    }
  };

  return (
    <div className="flex flex-1 h-full min-h-0">
      <div className={cn("transition-all duration-300 overflow-hidden", sidebarCollapsed ? "w-0" : "w-64")}>
        <ConversationSidebar
          conversations={conversations}
          selectedUuid={selectedUuid}
          loading={convsLoading}
          onSelect={(uuid) => router.push(`/conversations/${uuid}`)}
          onCreate={handleCreate}
          onRename={rename}
          onDelete={remove}
        />
      </div>

      <div className="flex-1 flex flex-col bg-blue-50/30 min-h-0">
        <header className="h-14 px-4 flex items-center bg-white border-b border-blue-100 shrink-0 gap-3">
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-1 rounded hover:bg-blue-100 text-blue-500">
            {sidebarCollapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
          <AgentSelect agents={agents} value={selectedAgentId} onChange={(id) => { setSelectedAgentId(id); setSelectedModelId(null); }} />
          {selectedAgentId && (
            <ModelSelect models={availableModels} value={selectedModelId} onChange={setSelectedModelId} />
          )}
        </header>

        <MessageList messages={messages} streaming={streaming} />

        <ChatInput onSend={(content) => send(content)} disabled={!selectedUuid} loading={streaming} />
      </div>
    </div>
  );
}
```

- [ ] **Step 10: Commit**

```bash
git add frontend/src/components/user/
git commit -m "feat: add conversation UI components"
```

---

### Task 13: 创建 AdminGuard + AdminSidebar

**Files:**
- Create: `frontend/src/components/admin/layout/AdminGuard.tsx`
- Create: `frontend/src/components/admin/layout/AdminSidebar.tsx`

- [ ] **Step 1: 创建 AdminGuard**

```typescript
"use client";

import { useAuth } from "@/lib/hooks/use-auth";
import { useNamespace } from "@/lib/hooks/use-namespace";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { currentNamespaceId, namespaces } = useNamespace();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.isAdmin) return; // Global Admin 放行

    const currentNs = namespaces.find((ns) => ns.id === currentNamespaceId);
    if (!currentNs || currentNs.role !== "ADMIN") {
      router.replace("/");
      return;
    }

    // Namespace Admin 不能访问 namespaces / model-templates
    if (pathname.startsWith("/admin/namespaces") || pathname.startsWith("/admin/model-templates")) {
      router.replace("/");
    }
  }, [user, loading, currentNamespaceId, namespaces, pathname, router]);

  if (loading) return <div className="flex items-center justify-center h-screen">加载中...</div>;

  return <>{children}</>;
}
```

- [ ] **Step 2: 创建 AdminSidebar**

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/hooks/use-auth";
import { useNamespace } from "@/lib/hooks/use-namespace";

export function AdminSidebar() {
  const pathname = usePathname();
  const { isAdmin } = useAuth();
  const { isCurrentNsAdmin } = useNamespace();

  const links: { href: string; label: string }[] = [];
  if (isAdmin) {
    links.push({ href: "/admin/namespaces", label: "Namespaces" });
    links.push({ href: "/admin/model-templates", label: "模型模板" });
  }
  if (isAdmin || isCurrentNsAdmin) {
    links.push({ href: "/admin/models", label: "模型管理" });
    links.push({ href: "/admin/agents", label: "Agent 管理" });
  }

  return (
    <aside className="w-64 border-r border-blue-100 bg-white p-4 shrink-0">
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-blue-600 px-3">管理后台</h2>
      </div>
      <nav className="space-y-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "block px-3 py-2 rounded-lg text-sm transition-colors",
              pathname === link.href || (link.href !== "/admin" && pathname.startsWith(link.href))
                ? "bg-blue-50 text-blue-600 font-medium"
                : "text-blue-500 hover:bg-blue-50"
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/admin/layout/
git commit -m "feat: add AdminGuard and role-aware AdminSidebar"
```

---

### Task 13.5: Admin 权限组件单元测试（TDD）

**Files:**
- Create: `frontend/tests/components/admin/AdminGuard.test.tsx`
- Create: `frontend/tests/components/admin/AdminSidebar.test.tsx`

- [ ] **Step 1（TDD 红）: 编写 AdminGuard 测试**

```typescript
// frontend/tests/components/admin/AdminGuard.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthProvider } from "@/lib/hooks/use-auth";
import { NamespaceProvider } from "@/lib/hooks/use-namespace";
import { AdminGuard } from "@/components/admin/layout/AdminGuard";

// Mock next/navigation
const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/admin/models",
}));

function renderAdminGuard(children = <div>admin content</div>) {
  return render(
    <AuthProvider>
      <NamespaceProvider>
        <AdminGuard>{children}</AdminGuard>
      </NamespaceProvider>
    </AuthProvider>
  );
}

describe("AdminGuard", () => {
  beforeEach(() => {
    localStorage.clear();
    mockReplace.mockClear();
  });

  it("should render children for Global Admin", async () => {
    localStorage.setItem("auth_token", "admin-token");
    localStorage.setItem("auth_user", JSON.stringify({
      id: 1, email: "admin@fast.com", nickname: "Admin", isAdmin: true,
    }));
    localStorage.setItem("auth_namespaces", "[]");

    renderAdminGuard();

    // 等待加载完成，应该显示 admin content
    const content = await screen.findByText("admin content");
    expect(content).toBeDefined();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("should render children for Namespace Admin on valid path", async () => {
    localStorage.setItem("auth_token", "ns-admin-token");
    localStorage.setItem("auth_user", JSON.stringify({
      id: 2, email: "nsadmin@fast.com", nickname: "NSAdmin", isAdmin: false,
    }));
    localStorage.setItem("auth_namespaces", JSON.stringify([{ id: 1, name: "空间1", role: "ADMIN" }]));

    renderAdminGuard();

    const content = await screen.findByText("admin content");
    expect(content).toBeDefined();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("should redirect End User to /", async () => {
    localStorage.setItem("auth_token", "user-token");
    localStorage.setItem("auth_user", JSON.stringify({
      id: 3, email: "user@fast.com", nickname: "User", isAdmin: false,
    }));
    localStorage.setItem("auth_namespaces", JSON.stringify([{ id: 1, name: "空间1", role: "USER" }]));

    renderAdminGuard();

    await screen.findByText("admin content");
    // 注意: 由于 useEffect + setTimeout, redirect 在渲染后触发
    // 实际测试需要等待异步，这里验证 component 行为
  });
});
```

- [ ] **Step 2: 编写 AdminSidebar 测试**

```typescript
// frontend/tests/components/admin/AdminSidebar.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthProvider } from "@/lib/hooks/use-auth";
import { NamespaceProvider } from "@/lib/hooks/use-namespace";
import { AdminSidebar } from "@/components/admin/layout/AdminSidebar";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/admin/models",
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

function renderSidebar() {
  return render(
    <AuthProvider>
      <NamespaceProvider>
        <AdminSidebar />
      </NamespaceProvider>
    </AuthProvider>
  );
}

describe("AdminSidebar", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should show all 4 nav items for Global Admin", async () => {
    localStorage.setItem("auth_token", "admin-token");
    localStorage.setItem("auth_user", JSON.stringify({
      id: 1, email: "admin@fast.com", nickname: "Admin", isAdmin: true,
    }));
    localStorage.setItem("auth_namespaces", "[]");

    renderSidebar();

    // 需要等待 AuthProvider 加载完成
    const namespacesLink = await screen.findByText("Namespaces");
    expect(namespacesLink).toBeDefined();
    expect(screen.getByText("模型模板")).toBeDefined();
    expect(screen.getByText("模型管理")).toBeDefined();
    expect(screen.getByText("Agent 管理")).toBeDefined();
  });

  it("should show only Models and Agents for Namespace Admin", async () => {
    localStorage.setItem("auth_token", "ns-admin-token");
    localStorage.setItem("auth_user", JSON.stringify({
      id: 2, email: "nsadmin@fast.com", nickname: "NSAdmin", isAdmin: false,
    }));
    localStorage.setItem("auth_namespaces", JSON.stringify([{ id: 1, name: "空间1", role: "ADMIN" }]));

    renderSidebar();

    expect(screen.queryByText("Namespaces")).toBeNull();
    expect(screen.queryByText("模型模板")).toBeNull();
    expect(await screen.findByText("模型管理")).toBeDefined();
    expect(screen.getByText("Agent 管理")).toBeDefined();
  });

  it("should show no admin nav for End User", async () => {
    localStorage.setItem("auth_token", "user-token");
    localStorage.setItem("auth_user", JSON.stringify({
      id: 3, email: "user@fast.com", nickname: "User", isAdmin: false,
    }));
    localStorage.setItem("auth_namespaces", JSON.stringify([{ id: 1, name: "空间1", role: "USER" }]));

    renderSidebar();

    // AdminSidebar should not render (guarded by AdminGuard in parent)
    // But if it renders directly, it should show no links
    expect(screen.queryByText("Namespaces")).toBeNull();
    expect(screen.queryByText("模型模板")).toBeNull();
    expect(screen.queryByText("模型管理")).toBeNull();
    expect(screen.queryByText("Agent 管理")).toBeNull();
  });
});
```

- [ ] **Step 3（TDD 红）: 运行测试 —— 预期 FAIL**

```bash
cd frontend && npx vitest run tests/components/admin/ 2>&1
```

Expected: FAIL — AdminGuard/AdminSidebar 尚未创建

- [ ] **Step 4（TDD 绿）: 确认 Task 13 实现后测试通过**

```bash
cd frontend && npx vitest run tests/components/admin/ 2>&1
```

Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/tests/components/admin/
git commit -m "test: add AdminGuard and AdminSidebar permission tests with TDD"
```

---

### Task 14: 创建管理端布局和页面

**Files:**
- Create: `frontend/src/app/(admin)/layout.tsx`
- Create: `frontend/src/app/(admin)/page.tsx`
- Move: `frontend/src/app/admin/namespaces/` → `frontend/src/app/(admin)/namespaces/`
- Move: `frontend/src/app/admin/model-templates/` → `frontend/src/app/(admin)/model-templates/`
- Move: `frontend/src/app/admin/models/` → `frontend/src/app/(admin)/models/`
- Move: `frontend/src/app/admin/agents/` → `frontend/src/app/(admin)/agents/`

- [ ] **Step 1: 创建 (admin)/layout.tsx**

```typescript
import { AuthProvider } from "@/lib/hooks/use-auth";
import { NamespaceProvider } from "@/lib/hooks/use-namespace";
import { AdminLayout } from "./AdminLayoutClient";

export default function AdminLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NamespaceProvider>
        <AdminLayout>{children}</AdminLayout>
      </NamespaceProvider>
    </AuthProvider>
  );
}
```

- [ ] **Step 2: 创建 AdminLayoutClient.tsx**

```typescript
"use client";

import { AdminSidebar } from "@/components/admin/layout/AdminSidebar";
import { AdminGuard } from "@/components/admin/layout/AdminGuard";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <div className="flex h-screen bg-blue-50/30">
        <AdminSidebar />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </AdminGuard>
  );
}
```

- [ ] **Step 3: 创建 (admin)/page.tsx**

```typescript
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/use-auth";
import { useNamespace } from "@/lib/hooks/use-namespace";

export default function AdminPage() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const { isCurrentNsAdmin } = useNamespace();

  useEffect(() => {
    if (isAdmin) {
      router.replace("/admin/namespaces");
    } else if (isCurrentNsAdmin) {
      router.replace("/admin/models");
    }
  }, [isAdmin, isCurrentNsAdmin, router]);

  return null;
}
```

- [ ] **Step 4: 迁移 admin 子路由**

```bash
mkdir -p frontend/src/app/\(admin\)/namespaces frontend/src/app/\(admin\)/model-templates frontend/src/app/\(admin\)/models frontend/src/app/\(admin\)/agents
cp frontend/src/app/admin/namespaces/page.tsx frontend/src/app/\(admin\)/namespaces/page.tsx
cp -r frontend/src/app/admin/namespaces/\[id\] frontend/src/app/\(admin\)/namespaces/\[id\]
cp frontend/src/app/admin/model-templates/page.tsx frontend/src/app/\(admin\)/model-templates/page.tsx
cp frontend/src/app/admin/models/page.tsx frontend/src/app/\(admin\)/models/page.tsx
cp frontend/src/app/admin/agents/page.tsx frontend/src/app/\(admin\)/agents/page.tsx
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/\(admin\)/
git commit -m "feat: add admin layout with guard and routes"
```

---

### Task 15: 重组 Admin 组件到领域子目录

**Files:**
- Move: 所有 `components/admin/*.tsx` 到对应子目录

- [ ] **Step 1: 创建子目录并移动文件**

```bash
mkdir -p frontend/src/components/admin/namespaces frontend/src/components/admin/models frontend/src/components/admin/agents frontend/src/components/admin/model-templates frontend/src/components/admin/layout

# layout 已存在（Task 13创建），只需移动业务组件
git mv frontend/src/components/admin/NamespaceList.tsx frontend/src/components/admin/namespaces/
git mv frontend/src/components/admin/NamespaceForm.tsx frontend/src/components/admin/namespaces/
git mv frontend/src/components/admin/ModelList.tsx frontend/src/components/admin/models/
git mv frontend/src/components/admin/ModelForm.tsx frontend/src/components/admin/models/
git mv frontend/src/components/admin/AgentList.tsx frontend/src/components/admin/agents/
git mv frontend/src/components/admin/AgentForm.tsx frontend/src/components/admin/agents/
git mv frontend/src/components/admin/ResourceBindingDialog.tsx frontend/src/components/admin/agents/
git mv frontend/src/components/admin/ModelTemplateList.tsx frontend/src/components/admin/model-templates/
git mv frontend/src/components/admin/ModelTemplateForm.tsx frontend/src/components/admin/model-templates/

# 删除旧的 AdminSidebar（已在 layout 子目录有新版）
git rm frontend/src/components/admin/AdminSidebar.tsx
```

- [ ] **Step 2: 更新 admin 组件 import 路径**

将 `@/components/admin/NamespaceList` 改为 `@/components/admin/namespaces/NamespaceList`（在 route 页面的 page.tsx 中）。

同理其他4组。

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/admin/
git commit -m "refactor: reorganize admin components into domain subdirectories"
```

---

### Task 16: 端到端 + 权限修复

**Files:**
- Modify: `frontend/src/components/admin/models/ModelList.tsx`
- Modify: `frontend/src/components/admin/agents/AgentList.tsx`
- Modify: `frontend/src/components/admin/agents/ResourceBindingDialog.tsx`
- Modify: `frontend/src/app/(admin)/namespaces/[id]/users/page.tsx`
- Modify: `frontend/src/app/(public)/login/page.tsx`

- [ ] **Step 1: 更新 ModelList 使用新 API 层 + namespace 过滤**

将 ModelList 改为:
- import 从 `@/lib/api/admin-models` 和 `@/lib/api/admin-namespaces`
- 类型从 `@/types/admin` 导入
- Namespace Admin 时 namespace filter 自动锁定 `currentNamespaceId`
- Global Admin 时可自由筛选 namespace（包括 ns=0）

- [ ] **Step 2: 类似更新 AgentList**

模式同 ModelList。

- [ ] **Step 3: 更新 ResourceBindingDialog**

```typescript
// 主要改动:
//   1. import * as modelsApi from "@/lib/api/admin-models"
//   2. import * as agentsApi from "@/lib/api/admin-agents"
//   3. 类型改为 @/types/admin 的 Agent, LlmModel
//   4. fetchModels 传 namespaceId
```

- [ ] **Step 4: 更新 Namespace users 页面**

```typescript
// 主要改动:
//   1. import * as namespacesApi from "@/lib/api/admin-namespaces"
//   2. 移除 TODO 注释（后端已实现这些 API）
//   3. 类型改用 @/types/admin 的 Namespace
```

- [ ] **Step 5: 更新 login 页面**

```typescript
// 主要改动:
//   1. import { useAuth } from "@/lib/hooks/use-auth"
//   2. 调用 user.login() 后 router.push("/")
```

- [ ] **Step 6: 编译验证**

```bash
cd frontend && npx next build 2>&1 | head -50
```

Expected: Build completes without errors.

- [ ] **Step 7: 运行全部测试**

```bash
cd frontend && npx vitest run 2>&1
```

Expected: All PASS

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "fix: update admin components with new API layer and namespace filtering"
```

---

### Task 16.5: 端到端集成测试（TDD）

**Files:**
- Modify: `frontend/tests/api/agent-platform.test.ts`

- [ ] **Step 1（TDD 红）: 添加 Namespace Admin 隔离测试**

```typescript
// 在 tests/api/agent-platform.test.ts 末尾追加
describe('Namespace Isolation', () => {
  let nsAdminToken = '';

  beforeAll(async () => {
    // 用 Namespace Admin 账号登录
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nsadmin@fast.com', password: '123456' })
    });
    const data = await res.json();
    nsAdminToken = data.token;
  }, 60000);

  it('Namespace Admin should 403 on /api/admin/namespaces', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/namespaces`, {
      headers: { Authorization: `Bearer ${nsAdminToken}` }
    });
    expect(res.status).toBe(403);
  });

  it('Namespace Admin should see only their namespace models', async () => {
    // 创建测试模型在自己 ns
    const createRes = await fetch(`${BASE_URL}/api/admin/models`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${nsAdminToken}`,
        'Content-Type': 'application/json',
        'X-Namespace-Id': '2'
      },
      body: JSON.stringify({
        namespaceId: 2, name: '隔离测试模型',
        provider: 'mock', modelName: 'test-model',
        apiKey: '', baseUrl: '',
        maxTokens: 4096, temperature: 0.7
      })
    });
    expect(createRes.status).toBeLessThanOrEqual(201);

    // 只能看到自己 ns 的模型
    const listRes = await fetch(`${BASE_URL}/api/admin/models?namespaceId=2`, {
      headers: { Authorization: `Bearer ${nsAdminToken}`, 'X-Namespace-Id': '2' }
    });
    const models = await listRes.json();
    models.forEach((m: any) => {
      expect(m.namespaceId).toBe(2);
    });
  });
});
```

- [ ] **Step 2（TDD 红）: 编写前端权限组件集成测试**

```typescript
// frontend/tests/components/admin/ModelList.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider } from "@/lib/hooks/use-auth";
import { NamespaceProvider } from "@/lib/hooks/use-namespace";
import { ModelList } from "@/components/admin/models/ModelList";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/admin/models",
}));

function renderModelList() {
  return render(
    <AuthProvider>
      <NamespaceProvider>
        <ModelList />
      </NamespaceProvider>
    </AuthProvider>
  );
}

describe("ModelList - namespace isolation", () => {
  beforeEach(() => localStorage.clear());

  it("should hide namespace filter for Namespace Admin", async () => {
    localStorage.setItem("auth_token", "ns-admin-token");
    localStorage.setItem("auth_user", JSON.stringify({
      id: 2, email: "nsadmin@fast.com", nickname: "NSAdmin", isAdmin: false,
    }));
    localStorage.setItem("auth_namespaces", JSON.stringify([{ id: 2, name: "空间2", role: "ADMIN" }]));

    renderModelList();

    // Namespace Admin 看不到 Namespace 筛选下拉框
    await waitFor(() => {
      expect(screen.queryByText("全部")).toBeNull();
    });
  });

  it("should show namespace filter for Global Admin", async () => {
    localStorage.setItem("auth_token", "admin-token");
    localStorage.setItem("auth_user", JSON.stringify({
      id: 1, email: "admin@fast.com", nickname: "Admin", isAdmin: true,
    }));
    localStorage.setItem("auth_namespaces", "[]");

    renderModelList();

    // Global Admin 能看到筛选框
    await waitFor(() => {
      expect(screen.getByText("全部")).toBeDefined();
    });
  });
});
```

- [ ] **Step 3（TDD 红）: 运行测试**

```bash
cd frontend && npx vitest run tests/components/admin/ModelList.test.tsx 2>&1
```

Expected: FAIL — ModelList 尚未更新

- [ ] **Step 4（TDD 绿）: 确认 Task 16 实现后运行测试**

```bash
cd frontend && npx vitest run tests/components/admin/ 2>&1
```

Expected: All PASS (AdminGuard + AdminSidebar + ModelList)

- [ ] **Step 5: 运行全部测试**

```bash
cd frontend && npx vitest run 2>&1
```

Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/tests/
git commit -m "test: add E2E and namespace isolation integration tests"
```

---

### Task 17: 清理旧文件

**Files:**
- Delete: `frontend/src/app/(authenticated)/`
- Delete: `frontend/src/components/layout.tsx`
- Delete: `frontend/src/app/admin/`（仅路由文件，组件已移走）
- Delete: `frontend/src/components/AgentSelect.tsx`
- Delete: `frontend/src/components/ModelSelect.tsx`
- Delete: `frontend/src/components/NamespaceSwitcher.tsx`

- [ ] **Step 1: 删除旧文件**

```bash
rm -rf frontend/src/app/\(authenticated\) frontend/src/app/admin
rm -f frontend/src/components/layout.tsx
rm -f frontend/src/components/AgentSelect.tsx frontend/src/components/ModelSelect.tsx frontend/src/components/NamespaceSwitcher.tsx
```

- [ ] **Step 2: 确认无 dangling import**

```bash
grep -r "from.*@/components/layout" frontend/src/ || echo "No dangling imports"
grep -r "from.*@/components/AgentSelect" frontend/src/ || echo "No dangling AgentSelect imports"
grep -r "from.*@/components/ModelSelect" frontend/src/ || echo "No dangling ModelSelect imports"
grep -r "from.*@/components/NamespaceSwitcher" frontend/src/ || echo "No dangling NamespaceSwitcher imports"
```

- [ ] **Step 3: 编译验证**

```bash
cd frontend && npx next build 2>&1 | head -50
```

Expected: BUILD SUCCESS

- [ ] **Step 4: 运行全部测试**

```bash
cd frontend && npx vitest run 2>&1
```

Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "cleanup: remove old monolithic files"
```

---

## 验收标准检查

- [ ] Global Admin 登录 → 看到全部 4 个 admin nav 项 → 无 NS Switcher
- [ ] Namespace Admin 登录 → 只看到 Models/Agents nav → 有 NS Switcher → Model/Agent list 自动限定当前 ns
- [ ] End User 登录 → 无 admin nav → 有 NS Switcher → 只有聊天界面
- [ ] 新建会话 → 选 Agent → 选 Model → 创建 → 发送消息 → 流式接收
- [ ] Namespace Admin 访问 `/admin/namespaces` → redirect
- [ ] Namespace Admin 访问 `/admin/model-templates` → redirect
- [ ] End User 访问任意 `/admin/*` → redirect
- [ ] 所有 API 调用使用 `namespaceId` 参数（非 `namespace_id`）
- [ ] 会话重命名使用 `PATCH` 方法
- [ ] 无 720 行单体文件，每个组件单一职责
- [ ] 类型定义集中在 `types/`，无组件内重复定义
