"use client";

import { UserSidebar } from "@/components/user/layout/UserSidebar";
import { UserHeader } from "@/components/user/layout/UserHeader";

export function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <UserSidebar />
      <div className="flex-1 flex flex-col">
        <header className="h-14 bg-white border-b border-blue-100 flex items-center justify-end px-4">
          <UserHeader />
        </header>
        <main className="flex-1 h-screen overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
