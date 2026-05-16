"use client";

import { useState, useCallback, useEffect } from "react";
import * as conversationsApi from "@/lib/api/conversations";
import type { Conversation } from "@/types/chat";

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUuid, setSelectedUuid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const list = useCallback(async () => {
    setLoading(true);
    try {
      const data = await conversationsApi.listConversations();
      setConversations(data);
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (name: string, agentId: number, modelId: number, namespaceId: number) => {
    const conv = await conversationsApi.createConversation({
      name,
      agent_id: agentId,
      model_id: modelId,
      namespace_id: namespaceId,
    });
    setConversations((prev) => [...prev, conv]);
    setSelectedUuid(conv.uuid);
    return conv;
  }, []);

  const rename = useCallback(async (uuid: string, name: string) => {
    await conversationsApi.renameConversation(uuid, name);
    setConversations((prev) =>
      prev.map((c) => (c.uuid === uuid ? { ...c, name } : c))
    );
  }, []);

  const remove = useCallback(async (uuid: string) => {
    await conversationsApi.deleteConversation(uuid);
    setConversations((prev) => prev.filter((c) => c.uuid !== uuid));
    if (selectedUuid === uuid) {
      setSelectedUuid(null);
    }
  }, [selectedUuid]);

  const select = useCallback((uuid: string) => {
    setSelectedUuid(uuid);
  }, []);

  useEffect(() => {
    list();
  }, [list]);

  return { conversations, selectedUuid, loading, list, create, rename, remove, select };
}
