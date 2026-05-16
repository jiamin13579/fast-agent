import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAuth, AuthProvider } from "@/lib/hooks/use-auth";

vi.mock("next/navigation", () => {
  const router = { push: () => {}, replace: () => {}, back: () => {}, forward: () => {}, refresh: () => {}, prefetch: () => {} };
  return { useRouter: () => router, usePathname: () => "/", useSearchParams: () => new URLSearchParams() };
});

function renderUseAuth() {
  return renderHook(() => useAuth(), { wrapper: AuthProvider });
}

describe("useAuth", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should detect Global Admin from token", async () => {
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
});
