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
