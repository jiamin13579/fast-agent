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
