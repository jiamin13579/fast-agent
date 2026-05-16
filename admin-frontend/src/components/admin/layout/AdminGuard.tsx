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

    if (user.isAdmin) return;

    const currentNs = namespaces.find((ns) => ns.id === currentNamespaceId);
    if (!currentNs || currentNs.role !== "ADMIN") {
      router.replace("/");
      return;
    }

    if (pathname.startsWith("/admin/namespaces") || pathname.startsWith("/admin/model-templates")) {
      router.replace("/");
    }
  }, [user, loading, currentNamespaceId, namespaces, pathname, router]);

  if (loading) return <div className="flex items-center justify-center h-screen">加载中...</div>;

  return <>{children}</>;
}
