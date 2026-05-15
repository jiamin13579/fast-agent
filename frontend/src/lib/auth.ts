import { API_BASE } from "@/lib/config";

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";
const NAMESPACES_KEY = "auth_namespaces";

export interface User {
  id: number;
  email: string;
  nickname: string;
  isAdmin: boolean;
}

export interface NamespaceInfo {
  id: number;
  name?: string;
  role: string;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(USER_KEY);
  return stored ? JSON.parse(stored) : null;
}

export function getNamespaces(): NamespaceInfo[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(NAMESPACES_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(NAMESPACES_KEY);
  document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
}

export async function login(email: string, password: string): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "登录失败");
  }

  const data = await res.json();
  setToken(data.token);
  setUser(data.user);
  if (data.namespaces) {
    localStorage.setItem(NAMESPACES_KEY, JSON.stringify(data.namespaces));
  }
  document.cookie = `auth_token=${data.token}; path=/`;
  return data.user;
}

export async function getCurrentUser(): Promise<{ user: User; namespaces: NamespaceInfo[] }> {
  const token = getToken();
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    clearAuth();
    throw new Error("未登录");
  }

  const data = await res.json();
  setUser(data.user);
  if (data.namespaces) {
    localStorage.setItem(NAMESPACES_KEY, JSON.stringify(data.namespaces));
  }
  return data;
}

function setUser(user: User) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
