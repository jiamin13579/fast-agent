import { API_BASE } from "@/lib/config";
import type { Admin } from "@/types/auth";

const TOKEN_KEY = "auth_token";
const ADMIN_KEY = "auth_admin";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getAdmin(): Admin | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(ADMIN_KEY);
  return stored ? JSON.parse(stored) : null;
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ADMIN_KEY);
  document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
}

export async function login(username: string, password: string): Promise<Admin> {
  const res = await fetch(`${API_BASE}/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "登录失败");
  }

  const data = await res.json();
  setToken(data.token);
  localStorage.setItem(ADMIN_KEY, JSON.stringify(data.admin));
  document.cookie = `auth_token=${data.token}; path=/`;
  return data.admin;
}

export async function getCurrentAdmin(): Promise<Admin> {
  const token = getToken();
  const res = await fetch(`${API_BASE}/admin/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    clearAuth();
    throw new Error("未登录");
  }

  const data = await res.json();
  // /me returns flat {id, username, nickname, isGlobalAdmin}
  localStorage.setItem(ADMIN_KEY, JSON.stringify(data));
  return data;
}

export function setAdmin(admin: Admin) {
  localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
}
