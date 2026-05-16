"use client";

import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { MessageSquare, Sparkles } from "lucide-react";

const navItems = [
  { icon: MessageSquare, label: "对话", href: "/conversations" },
];

export function UserSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className="w-16 flex flex-col h-full bg-white border-r border-blue-100 shadow-sm">
      <div className="h-14 flex items-center justify-center border-b border-blue-100">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-md">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
      </div>

      <nav className="flex-1 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={cn(
                "w-full h-12 flex items-center justify-center transition-all relative group",
                isActive ? "text-blue-600" : "text-blue-400/50 hover:text-blue-500"
              )}
              title={item.label}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-r" />
              )}
              <item.icon className="h-5 w-5" />
              <div className="absolute left-full ml-2 px-2 py-1 bg-white text-blue-600 text-xs rounded shadow-lg border border-blue-100 opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                {item.label}
              </div>
            </button>
          );
        })}
      </nav>

      <div className="p-4 text-center text-blue-300/50 text-xs border-t border-blue-100">v1</div>
    </aside>
  );
}
