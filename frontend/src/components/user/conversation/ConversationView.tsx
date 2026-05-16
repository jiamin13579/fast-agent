"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useNamespace } from "@/lib/hooks/use-namespace";
import { useConversations } from "@/lib/hooks/use-conversations";
import { useMessages } from "@/lib/hooks/use-messages";
import * as agentsApi from "@/lib/api/agents";
import { ConversationSidebar } from "./ConversationSidebar";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { AgentSelect } from "@/components/user/selectors/AgentSelect";
import { ModelSelect } from "@/components/user/selectors/ModelSelect";
import { ChevronLeft, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Agent } from "@/types/admin";

interface Props {
  conversationUuid?: string;
}

export function ConversationView({ conversationUuid }: Props) {
  const router = useRouter();
  const { currentNamespaceId } = useNamespace();
  const { conversations, selectedUuid, loading: convsLoading, create, rename, remove, select } = useConversations();
  const { messages, streaming, send } = useMessages(selectedUuid);

  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [availableModels, setAvailableModels] = useState<{ id: number; name: string }[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (conversationUuid) {
      select(conversationUuid);
    }
  }, [conversationUuid, select]);

  useEffect(() => {
    if (!currentNamespaceId) return;
    agentsApi.listAgents(currentNamespaceId).then(setAgents).catch(console.error);
  }, [currentNamespaceId]);

  useEffect(() => {
    if (!selectedAgentId) { setAvailableModels([]); return; }
    agentsApi.getAgentResources(selectedAgentId, "MODEL")
      .then((resources) => {
        const modelIds = resources.map((r) => r.resource_id);
        setAvailableModels(modelIds.map((id) => ({ id, name: `模型 ${id}` })));
      })
      .catch(console.error);
  }, [selectedAgentId]);

  const handleCreate = async () => {
    if (!selectedAgentId || !selectedModelId) return;
    try {
      const conv = await create("新对话", selectedAgentId, selectedModelId, currentNamespaceId);
      router.push(`/conversations/${conv.uuid}`);
    } catch (e) {
      console.error("创建失败", e);
    }
  };

  return (
    <div className="flex flex-1 h-full min-h-0">
      <div className={cn("transition-all duration-300 overflow-hidden", sidebarCollapsed ? "w-0" : "w-64")}>
        <ConversationSidebar
          conversations={conversations}
          selectedUuid={selectedUuid}
          loading={convsLoading}
          onSelect={(uuid) => router.push(`/conversations/${uuid}`)}
          onCreate={handleCreate}
          onRename={rename}
          onDelete={remove}
        />
      </div>

      <div className="flex-1 flex flex-col bg-blue-50/30 min-h-0">
        <header className="h-14 px-4 flex items-center bg-white border-b border-blue-100 shrink-0 gap-3">
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-1 rounded hover:bg-blue-100 text-blue-500">
            {sidebarCollapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
          <AgentSelect agents={agents} value={selectedAgentId} onChange={(id) => { setSelectedAgentId(id); setSelectedModelId(null); }} />
          {selectedAgentId && (
            <ModelSelect models={availableModels} value={selectedModelId} onChange={setSelectedModelId} />
          )}
        </header>

        <MessageList messages={messages} streaming={streaming} />

        <ChatInput onSend={(content) => send(content)} disabled={!selectedUuid} loading={streaming} />
      </div>
    </div>
  );
}
