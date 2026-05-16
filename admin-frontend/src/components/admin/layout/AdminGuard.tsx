"use client";

import { useAuth } from "@/lib/hooks/use-auth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { admin, isGlobalAdmin, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!admin) {
      router.replace("/login");
      return;
    }

    if (isGlobalAdmin) return;

    if (pathname.startsWith("/admin/namespaces") || pathname.startsWith("/admin/model-templates")) {
      router.replace("/admin/agents");
    }
  }, [admin, isGlobalAdmin, loading, pathname, router]);

  if (loading) return <div className="flex items-center justify-center h-screen">加载中...</div>;

  return <>{children}</>;
}
