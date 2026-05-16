"use client";

import { AdminSidebar } from "@/components/admin/layout/AdminSidebar";
import { AdminGuard } from "@/components/admin/layout/AdminGuard";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <div className="flex h-screen bg-blue-50/30">
        <AdminSidebar />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </AdminGuard>
  );
}
