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

  http.get("*/api/admin/models", () => HttpResponse.json([])),
  http.get("*/api/admin/namespaces", () => HttpResponse.json([])),
];
