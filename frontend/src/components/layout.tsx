"use client";

import { createContext, useContext, useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { MessageSquare, Sparkles, Clock, Key, Palette, LogOut } from "lucide-react";

type View = "chat" | "skills" | "tasks" | "llm" | "preferences";

interface AppContextType {
  view: View;
  setView: (v: View) => void;
}

const AppContext = createContext<AppContextType>({
  view: "chat",
  setView: () => {},
});

export const useApp = () => useContext(AppContext);

const navItems = [
  { id: "chat" as View, icon: MessageSquare, label: "对话" },
  { id: "skills" as View, icon: Sparkles, label: "技能" },
  { id: "tasks" as View, icon: Clock, label: "任务" },
  { id: "llm" as View, icon: Key, label: "LLM" },
  { id: "preferences" as View, icon: Palette, label: "偏好" },
];

export function Sidebar() {
  const { view, setView } = useApp();

  return (
    <aside className="w-16 flex flex-col h-full bg-white border-r border-blue-100 shadow-sm">
      {/* Logo */}
      <div className="h-14 flex items-center justify-center border-b border-blue-100">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-md">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
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

      {/* Version */}
      <div className="p-4 text-center text-blue-300/50 text-xs border-t border-blue-100">v1</div>
    </aside>
  );
}

function getInitials(name: string): string {
  return name ? name.charAt(0).toUpperCase() : "?";
}

export function HeaderRight() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<{ nickname: string; email: string; role: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const controller = new AbortController();
    const token = localStorage.getItem("auth_token");
    if (token) {
      fetch(`${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080/api"}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((data) => {
          setUser(data);
          setIsLoading(false);
        })
        .catch(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
    return () => controller.abort();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    router.push("/login");
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4">
        <div className="w-8 h-8 rounded-full bg-blue-100 animate-pulse" />
        <div className="w-16 h-4 bg-blue-100 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
      >
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-medium">
          {getInitials(user?.nickname || "")}
        </div>
        <span className="text-sm text-blue-700">{user?.nickname || "用户"}</span>
        <span className="text-blue-400 text-xs">{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-blue-100 py-2 z-50">
          <div className="px-4 py-2 border-b border-blue-50">
            <div className="font-medium text-blue-800">{user?.nickname}</div>
            <div className="text-xs text-blue-400">{user?.email}</div>
            <div className="mt-1">
              <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-600">
                {user?.role || "USER"}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" /> 退出登录
          </button>
        </div>
      )}
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [view, setView] = useState<View>("chat");
  const hideSidebar = pathname === "/login";

  return (
    <AppContext.Provider value={{ view, setView }}>
      <div className="flex h-screen">
        {!hideSidebar && <Sidebar />}
        <div className="flex-1 flex flex-col">
          <header className="h-14 bg-white border-b border-blue-100 flex items-center justify-end px-4">
            <HeaderRight />
          </header>
          <main className="flex-1 h-screen overflow-hidden">{children}</main>
        </div>
      </div>
    </AppContext.Provider>
  );
}
