import { api } from "./client";
import type { Agent, AgentResource } from "@/types/admin";

export async function listAgents(namespaceId: number): Promise<Agent[]> {
  return api.get<Agent[]>(`/user/agents?namespaceId=${namespaceId}`);
}

export async function getAgentResources(agentId: number, type?: string): Promise<AgentResource[]> {
  const query = type ? `?type=${type}` : "";
  return api.get<AgentResource[]>(`/user/agents/${agentId}/resources${query}`);
}
