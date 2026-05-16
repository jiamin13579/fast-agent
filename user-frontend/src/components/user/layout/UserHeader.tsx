"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useNamespace } from "@/lib/hooks/use-namespace";
import { NamespaceSwitcher } from "@/components/user/NamespaceSwitcher";
import { LogOut } from "lucide-react";
import { getUser, type User } from "@/lib/auth";

function getInitials(name: string): string {
  return name ? name.charAt(0).toUpperCase() : "?";
}

export function UserHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const [localUser, setLocalUser] = useState<User | null>(null);
  const { namespaces, currentNamespaceId, switchNamespace } = useNamespace();
  const { logout } = useAuth();

  useEffect(() => {
    setLocalUser(getUser());
  }, []);

  return (
    <div className="flex items-center gap-3">
      {namespaces.length > 0 && (
        <NamespaceSwitcher
          namespaces={namespaces}
          current={currentNamespaceId}
          onChange={switchNamespace}
        />
      )}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-medium shadow-md shadow-blue-200/50">
            {getInitials(localUser?.nickname || "用")}
          </div>
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-blue-100 py-2 z-50">
            <div className="px-4 py-3 border-b border-blue-50">
              <div className="font-medium text-blue-800">{localUser?.nickname || "用户"}</div>
              <div className="text-xs text-blue-400 mt-0.5">{localUser?.email}</div>
              <div className="text-xs text-blue-400 mt-0.5">普通用户</div>
            </div>
            <button
              onClick={logout}
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
