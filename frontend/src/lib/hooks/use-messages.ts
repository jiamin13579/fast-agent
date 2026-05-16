"use client";

import { useState, useCallback, useEffect } from "react";
import * as conversationsApi from "@/lib/api/conversations";
import { joinRoom, leaveRoom, onEvent, offEvent } from "@/lib/socket";
import type { Message } from "@/types/chat";

export function useMessages(conversationUuid: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!conversationUuid) {
      setMessages([]);
      return;
    }
    conversationsApi.getMessages(conversationUuid)
      .then(setMessages)
      .catch(() => setError("加载消息失败"));
  }, [conversationUuid]);

  useEffect(() => {
    if (!conversationUuid) return;

    joinRoom(`conversation:${conversationUuid}`);

    const handleStream = (data: any) => {
      const type = data.type as string;
      const clientMsgId = data.client_msg_id as string;

      if (type === "chunk") {
        const content = data.content as string;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.uuid === clientMsgId && last.role === "assistant") {
            return [...prev.slice(0, -1), { ...last, content: last.content + content }];
          }
          return [...prev, {
            id: 0,
            uuid: clientMsgId || String(Date.now()),
            conversationUuid: conversationUuid,
            role: "assistant" as const,
            content,
            createdAt: new Date().toISOString(),
          }];
        });
      } else if (type === "done") {
        setStreaming(false);
      } else if (type === "error") {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === "assistant" && last.uuid === clientMsgId) {
            return [...prev.slice(0, -1), { ...last, content: last.content + "\n[错误] " + (data.message || "") }];
          }
          return prev;
        });
        setStreaming(false);
      }
    };

    onEvent("stream_event", handleStream);

    return () => {
      offEvent("stream_event", handleStream);
      leaveRoom(`conversation:${conversationUuid}`);
    };
  }, [conversationUuid]);

  const send = useCallback(async (content: string) => {
    if (!conversationUuid || !content.trim()) return;

    setStreaming(true);
    setError(null);

    const userMsgId = String(Date.now());
    const assistantMsgId = userMsgId + "_assistant";

    setMessages((prev) => [
      ...prev,
      { id: 0, uuid: userMsgId, conversationUuid, role: "user", content, createdAt: new Date().toISOString() },
      { id: 0, uuid: assistantMsgId, conversationUuid, role: "assistant", content: "", createdAt: new Date().toISOString() },
    ]);

    try {
      await conversationsApi.sendMessage(conversationUuid, content, assistantMsgId);
    } catch {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === "assistant") {
          return [...prev.slice(0, -1), { ...last, content: last.content + "\n[错误] 发送失败" }];
        }
        return prev;
      });
      setStreaming(false);
    }
  }, [conversationUuid]);

  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, streaming, error, send, clear };
}
