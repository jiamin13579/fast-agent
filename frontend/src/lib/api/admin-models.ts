import { api } from "./client";
import type { LlmModel } from "@/types/admin";

export async function listModels(namespaceId?: number): Promise<LlmModel[]> {
  const query = namespaceId !== undefined ? `?namespaceId=${namespaceId}` : "";
  return api.get<LlmModel[]>(`/admin/models${query}`);
}

export async function getModel(id: number): Promise<LlmModel> {
  return api.get<LlmModel>(`/admin/models/${id}`);
}

export async function createModel(data: Partial<LlmModel>): Promise<void> {
  await api.post("/admin/models", data);
}

export async function updateModel(id: number, data: Partial<LlmModel>): Promise<void> {
  await api.put(`/admin/models/${id}`, data);
}

export async function deleteModel(id: number): Promise<void> {
  await api.delete(`/admin/models/${id}`);
}
