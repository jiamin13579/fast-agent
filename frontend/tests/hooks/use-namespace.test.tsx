import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useNamespace, NamespaceProvider } from "@/lib/hooks/use-namespace";
import { AuthProvider } from "@/lib/hooks/use-auth";

vi.mock("next/navigation", () => {
  const r = { push: () => {}, replace: () => {}, back: () => {}, forward: () => {}, refresh: () => {}, prefetch: () => {} };
  return { useRouter: () => r, usePathname: () => "/", useSearchParams: () => new URLSearchParams() };
});

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

  it("should set isCurrentNsAdmin to false when switching to non-admin namespace", async () => {
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

    expect(result.current.isCurrentNsAdmin).toBe(true);

    result.current.switchNamespace(2);
    await waitFor(() => expect(result.current.isCurrentNsAdmin).toBe(false));
  });

  it("should set currentNamespaceId=0 for Global Admin (empty namespaces)", async () => {
    localStorage.setItem("auth_token", "admin-token");
    localStorage.setItem("auth_namespaces", "[]");
    localStorage.setItem("auth_user", JSON.stringify({
      id: 1, email: "admin@fast.com", nickname: "Admin", isAdmin: true,
    }));

    const { result } = renderUseNamespace();
    await waitFor(() => expect(result.current.currentNamespaceId).toBe(0));
    expect(result.current.isCurrentNsAdmin).toBe(false);
  });
});
