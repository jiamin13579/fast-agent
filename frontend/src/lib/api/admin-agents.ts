import { api } from "./client";
import type { Agent, AgentResource } from "@/types/admin";

export async function listAgents(namespaceId?: number): Promise<Agent[]> {
  const query = namespaceId !== undefined ? `?namespaceId=${namespaceId}` : "";
  return api.get<Agent[]>(`/admin/agents${query}`);
}

export async function getAgent(id: number): Promise<Agent> {
  return api.get<Agent>(`/admin/agents/${id}`);
}

export async function createAgent(data: Partial<Agent>): Promise<void> {
  await api.post("/admin/agents", data);
}

export async function updateAgent(id: number, data: Partial<Agent>): Promise<void> {
  await api.put(`/admin/agents/${id}`, data);
}

export async function deleteAgent(id: number): Promise<void> {
  await api.delete(`/admin/agents/${id}`);
}

export async function bindResource(agentId: number, resourceType: string, resourceId: number): Promise<void> {
  await api.post(`/admin/agents/${agentId}/resources`, { resource_type: resourceType, resource_id: resourceId });
}

export async function unbindResource(agentId: number, resourceId: number, type: string): Promise<void> {
  await api.delete(`/admin/agents/${agentId}/resources/${resourceId}?type=${type}`);
}

export async function getAgentResources(agentId: number): Promise<{ id: number; resource_type: string; resource_id: number; resource_name?: string }[]> {
  return api.get(`/admin/agents/${agentId}/resources`);
}
