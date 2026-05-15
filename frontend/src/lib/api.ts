import { API_BASE } from "@/lib/config";
import { getToken, getNamespaces } from "@/lib/auth";

const NAMESPACE_KEY = "current_namespace_id";

export function getCurrentNamespaceId(): number {
  if (typeof window === "undefined") return 0;
  const stored = localStorage.getItem(NAMESPACE_KEY);
  if (stored) return parseInt(stored, 10);

  // Fallback to first namespace
  const namespaces = getNamespaces();
  if (namespaces.length > 0) {
    return namespaces[0].id;
  }
  return 0;
}

export function setCurrentNamespaceId(id: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(NAMESPACE_KEY, String(id));
}

export interface RequestOptions extends RequestInit {
  namespaceId?: number;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const token = getToken();
  const namespaceId = options.namespaceId ?? getCurrentNamespaceId();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Always include X-Namespace-Id header
  headers["X-Namespace-Id"] = String(namespaceId);

  if (options.body && typeof options.body === "object") {
    headers["Content-Type"] = "application/json";
  }

  const url = endpoint.startsWith("/") ? `${API_BASE}${endpoint}` : `${API_BASE}/${endpoint}`;

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  // Handle 204 No Content
  if (res.status === 204) return {} as T;

  return res.json();
}

// Convenience methods
export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: "POST", body: JSON.stringify(body) }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: "PUT", body: JSON.stringify(body) }),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: "PATCH", body: JSON.stringify(body) }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: "DELETE" }),
};