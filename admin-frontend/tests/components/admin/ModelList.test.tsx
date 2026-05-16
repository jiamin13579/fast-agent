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
  beforeEach(() => {
    localStorage.clear();
  });

  it("should hide namespace filter for Namespace Admin", async () => {
    localStorage.setItem("auth_token", "ns-admin-token");
    localStorage.setItem("auth_user", JSON.stringify({
      id: 2, email: "nsadmin@fast.com", nickname: "NSAdmin", isAdmin: false, mustChangePassword: false,
    }));
    localStorage.setItem("auth_namespaces", JSON.stringify([{ id: 2, name: "空间2", role: "ADMIN" }]));

    renderModelList();

    await waitFor(() => {
      expect(screen.queryByText("全部")).toBeNull();
    });
  });

  it("should show namespace filter for Global Admin", async () => {
    localStorage.setItem("auth_token", "admin-token");
    localStorage.setItem("auth_user", JSON.stringify({
      id: 1, email: "admin@fast.com", nickname: "Admin", isAdmin: true, mustChangePassword: false,
    }));
    localStorage.setItem("auth_namespaces", "[]");

    renderModelList();

    await waitFor(() => {
      expect(screen.getByText("全部")).toBeDefined();
    });
  });
});
