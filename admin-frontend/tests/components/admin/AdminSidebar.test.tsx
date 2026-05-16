import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthProvider } from "@/lib/hooks/use-auth";
import { NamespaceProvider } from "@/lib/hooks/use-namespace";
import { AdminSidebar } from "@/components/admin/layout/AdminSidebar";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/admin/models",
}));

// Mock Link component for testing
vi.mock("next/link", () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
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
      id: 1, email: "admin@fast.com", nickname: "Admin", isAdmin: true, mustChangePassword: false,
    }));
    localStorage.setItem("auth_namespaces", "[]");

    renderSidebar();

    expect(await screen.findByText("Namespaces")).toBeDefined();
    expect(screen.getByText("模型模板")).toBeDefined();
    expect(screen.getByText("模型管理")).toBeDefined();
    expect(screen.getByText("Agent 管理")).toBeDefined();
  });

  it("should show only Models and Agents for Namespace Admin", async () => {
    localStorage.setItem("auth_token", "ns-admin-token");
    localStorage.setItem("auth_user", JSON.stringify({
      id: 2, email: "nsadmin@fast.com", nickname: "NSAdmin", isAdmin: false, mustChangePassword: false,
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
      id: 3, email: "user@fast.com", nickname: "User", isAdmin: false, mustChangePassword: false,
    }));
    localStorage.setItem("auth_namespaces", JSON.stringify([{ id: 1, name: "空间1", role: "USER" }]));

    renderSidebar();

    // User has no isCurrentNsAdmin, sidebar should not render any links
    expect(screen.queryByText("Namespaces")).toBeNull();
    expect(screen.queryByText("模型模板")).toBeNull();
    expect(screen.queryByText("模型管理")).toBeNull();
    expect(screen.queryByText("Agent 管理")).toBeNull();
  });
});
