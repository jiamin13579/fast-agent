export interface Conversation {
  id: number;
  uuid: string;
  name: string;
  userId: number;
  agentId: number | null;
  modelId: number | null;
  namespaceId: number;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: number;
  uuid: string;
  conversationUuid: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

export interface CreateConversationRequest {
  name: string;
  agent_id: number;
  model_id: number;
  namespace_id: number;
}

export interface SendMessageRequest {
  content: string;
  client_msg_id: string;
}
