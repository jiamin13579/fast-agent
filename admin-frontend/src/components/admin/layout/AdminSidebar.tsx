"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/hooks/use-auth";

export function AdminSidebar() {
  const pathname = usePathname();
  const { isGlobalAdmin } = useAuth();

  const links: { href: string; label: string }[] = [];
  if (isGlobalAdmin) {
    links.push({ href: "/admin/namespaces", label: "Namespaces" });
    links.push({ href: "/admin/model-templates", label: "模型模板" });
  }
  links.push({ href: "/admin/models", label: "模型管理" });
  links.push({ href: "/admin/agents", label: "Agent 管理" });

  return (
    <aside className="w-64 border-r border-blue-100 bg-white p-4 shrink-0">
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-blue-600 px-3">管理后台</h2>
      </div>
      <nav className="space-y-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "block px-3 py-2 rounded-lg text-sm transition-colors",
              pathname === link.href || (link.href !== "/admin" && pathname.startsWith(link.href))
                ? "bg-blue-50 text-blue-600 font-medium"
                : "text-blue-500 hover:bg-blue-50"
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
