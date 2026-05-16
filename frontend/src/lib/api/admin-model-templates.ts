import { api } from "./client";
import type { ModelTemplate } from "@/types/admin";

export async function listTemplates(): Promise<ModelTemplate[]> {
  return api.get<ModelTemplate[]>("/admin/model-templates");
}

export async function getTemplate(id: number): Promise<ModelTemplate> {
  return api.get<ModelTemplate>(`/admin/model-templates/${id}`);
}

export async function createTemplate(data: Partial<ModelTemplate>): Promise<void> {
  await api.post("/admin/model-templates", data);
}

export async function updateTemplate(id: number, data: Partial<ModelTemplate>): Promise<void> {
  await api.put(`/admin/model-templates/${id}`, data);
}

export async function deleteTemplate(id: number): Promise<void> {
  await api.delete(`/admin/model-templates/${id}`);
}
