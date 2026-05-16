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
