export interface Namespace {
  id: number;
  code: string;
  name: string;
  description: string;
  status: number;
}

export interface LlmModel {
  id: number;
  namespaceId: number;
  name: string;
  provider: string;
  modelName: string;
  apiKey: string;
  baseUrl: string;
  maxTokens: number;
  temperature: number;
  status: number;
}

export interface Agent {
  id: number;
  namespaceId: number;
  name: string;
  description: string;
  systemPrompt: string;
  status: number;
  version: number;
  createdBy?: number;
}

export interface AgentResource {
  id: number;
  agentId: number;
  resourceType: "MODEL" | "TOOL" | "SKILL" | "MCP";
  resourceId: number;
}

export interface ModelTemplate {
  id: number;
  name: string;
  provider: string;
  modelName: string;
  baseUrl: string;
  maxTokens: number;
  temperature: number;
  description: string;
}
