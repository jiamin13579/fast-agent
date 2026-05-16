"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import * as authApi from "@/lib/api/auth";
import { getToken, setToken, clearAuth, getAdmin, setAdmin } from "@/lib/auth";
import type { Admin } from "@/types/auth";

interface AdminAuthContextType {
  admin: Admin | null;
  isGlobalAdmin: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  admin: null,
  isGlobalAdmin: false,
  loading: true,
  login: async () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AdminAuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [admin, setAdminState] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    const cachedAdmin = getAdmin();
    if (cachedAdmin) {
      setAdminState(cachedAdmin);
      setLoading(false);
    }

    authApi.getMe()
      .then((data) => {
        setAdminState(data);
        setAdmin(data);
      })
      .catch(() => {
        clearAuth();
        router.push("/login");
      })
      .finally(() => setLoading(false));
  }, [router]);

  const login = useCallback(async (username: string, password: string) => {
    const data = await authApi.login(username, password);
    setToken(data.token);
    setAdmin(data.admin);
    document.cookie = `auth_token=${data.token}; path=/`;
    setAdminState(data.admin);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    router.push("/login");
  }, [router]);

  return (
    <AdminAuthContext.Provider
      value={{
        admin,
        isGlobalAdmin: admin?.isGlobalAdmin ?? false,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}
