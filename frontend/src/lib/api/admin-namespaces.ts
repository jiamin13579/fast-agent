import { api } from "./client";
import type { Namespace } from "@/types/admin";

export async function listNamespaces(): Promise<Namespace[]> {
  return api.get<Namespace[]>("/admin/namespaces");
}

export async function getNamespace(id: number): Promise<Namespace> {
  return api.get<Namespace>(`/admin/namespaces/${id}`);
}

export async function createNamespace(data: Partial<Namespace>): Promise<void> {
  await api.post("/admin/namespaces", data);
}

export async function updateNamespace(id: number, data: Partial<Namespace>): Promise<void> {
  await api.put(`/admin/namespaces/${id}`, data);
}

export async function deleteNamespace(id: number): Promise<void> {
  await api.delete(`/admin/namespaces/${id}`);
}

export async function listNamespaceUsers(id: number): Promise<{ userId: number; role: string; nickname: string; email: string }[]> {
  return api.get(`/admin/namespaces/${id}/users`);
}

export async function updateUserRole(namespaceId: number, userId: number, role: string): Promise<void> {
  await api.put(`/admin/namespaces/${namespaceId}/users/${userId}`, { role });
}
