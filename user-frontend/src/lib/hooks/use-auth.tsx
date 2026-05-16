"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import * as authApi from "@/lib/api/auth";
import { getToken, setToken, clearAuth, getUser, setUser, getNamespaces, setNamespaces } from "@/lib/auth";
import type { User as AuthUser, NamespaceInfo } from "@/types/auth";

interface AuthContextType {
  user: AuthUser | null;
  namespaces: NamespaceInfo[];
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  namespaces: [],
  loading: true,
  login: async () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [namespaces, setNamespacesState] = useState<NamespaceInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    const cachedUser = getUser();
    const cachedNamespaces = getNamespaces();
    if (cachedUser) {
      setUserState(cachedUser);
      setNamespacesState(cachedNamespaces);
      setLoading(false);
    }

    authApi.getMe()
      .then((data) => {
        setUserState(data.user);
        setUser(data.user);
        setNamespacesState(data.namespaces);
        setNamespaces(data.namespaces);
      })
      .catch(() => {
        clearAuth();
        router.push("/login");
      })
      .finally(() => setLoading(false));
  }, [router]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    setToken(data.token);
    setUser(data.user);
    setNamespaces(data.namespaces);
    document.cookie = `auth_token=${data.token}; path=/`;
    setUserState(data.user);
    setNamespacesState(data.namespaces);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        namespaces,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
