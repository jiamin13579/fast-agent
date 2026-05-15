"use client";

import { createContext, useContext, useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { clearAuth, getNamespaces, getUser, getToken, User, NamespaceInfo } from "@/lib/auth";
import { MessageSquare, Palette, LogOut, Sparkles, Settings } from "lucide-react";
import { NamespaceSwitcher } from "@/components/NamespaceSwitcher";

type View = "conversation" | "skills" | "tasks" | "llm" | "preferences";

interface AppContextType {
  view: View;
  setView: (v: View) => void;
  currentNamespaceId: number;
  setCurrentNamespaceId: (id: number) => void;
  namespaces: NamespaceInfo[];
  isAdmin: boolean;
}

const AppContext = createContext<AppContextType>({
  view: "conversation",
  setView: () => {},
  currentNamespaceId: 0,
  setCurrentNamespaceId: () => {},
  namespaces: [],
  isAdmin: false,
});

export const useApp = () => useContext(AppContext);

const navItems = [
  { id: "conversation" as View, icon: MessageSquare, label: "对话" },
  { id: "preferences" as View, icon: Palette, label: "偏好" },
];

export function Sidebar() {
  const { view, setView } = useApp();

  return (
    <aside className="w-16 flex flex-col h-full bg-white border-r border-blue-100 shadow-sm">
      <div className="h-14 flex items-center justify-center border-b border-blue-100">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-md">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
      </div>

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

      <div className="p-4 text-center text-blue-300/50 text-xs border-t border-blue-100">v1</div>
    </aside>
  );
}

function getInitials(name: string): string {
  return name ? name.charAt(0).toUpperCase() : "?";
}

export function HeaderRight() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { namespaces, currentNamespaceId, setCurrentNamespaceId, isAdmin } = useApp();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const u = getUser();
    setUser(u);
    setIsLoading(false);
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
    clearAuth();
    window.location.href = "/login";
  };

  return (
    <div className="flex items-center gap-3">
      {!isAdmin && namespaces.length > 0 && (
        <NamespaceSwitcher
          namespaces={namespaces}
          current={currentNamespaceId}
          onChange={setCurrentNamespaceId}
        />
      )}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-medium shadow-md shadow-blue-200/50">
            {getInitials(user?.nickname || "用")}
          </div>
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-blue-100 py-2 z-50">
            <div className="px-4 py-3 border-b border-blue-50">
              <div className="font-medium text-blue-800">{user?.nickname || "用户"}</div>
              <div className="text-xs text-blue-400 mt-0.5">{user?.email}</div>
              <div className="text-xs text-blue-400 mt-0.5">
                {user?.isAdmin ? "全局管理员" : "普通用户"}
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
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [view, setView] = useState<View>("conversation");
  const [currentNamespaceId, setCurrentNamespaceId] = useState(0);
  const [namespaces, setNamespaces] = useState<NamespaceInfo[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const isLoginPage = pathname === "/login";

  useEffect(() => {
    const user = getUser();
    if (user) {
      setIsAdmin(user.isAdmin);
    }
    setNamespaces(getNamespaces());
    const savedNs = getNamespaces();
    if (savedNs.length > 0) {
      setCurrentNamespaceId(savedNs[0].id);
    }
  }, []);

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <AppContext.Provider value={{ view, setView, currentNamespaceId, setCurrentNamespaceId, namespaces, isAdmin }}>
      <div className="flex h-screen">
        <Sidebar />
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
