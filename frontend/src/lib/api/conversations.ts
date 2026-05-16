import { api } from "./client";
import type { Conversation, Message, CreateConversationRequest } from "@/types/chat";

export async function listConversations(): Promise<Conversation[]> {
  return api.get<Conversation[]>("/conversations");
}

export async function createConversation(data: CreateConversationRequest): Promise<Conversation> {
  return api.post<Conversation>("/conversations", data);
}

export async function renameConversation(uuid: string, name: string): Promise<void> {
  await api.patch(`/conversations/${uuid}`, { name });
}

export async function deleteConversation(uuid: string): Promise<void> {
  await api.delete(`/conversations/${uuid}`);
}

export async function sendMessage(uuid: string, content: string, clientMsgId: string): Promise<void> {
  await api.post(`/conversations/${uuid}/messages`, { content, client_msg_id: clientMsgId });
}

export async function getMessages(uuid: string): Promise<Message[]> {
  return api.get<Message[]>(`/conversations/${uuid}/messages`);
}
