"use client";

import { useEffect, useRef, useCallback } from "react";
import { getToken } from "./auth";

const WS_URL = `${process.env.NEXT_PUBLIC_WS_BASE || "ws://localhost:8080"}/ws/conversation`;

export type WsAction = {
  action: "send";
  conversation_uuid: string;
  content: string;
  client_msg_id?: string;
}
  | { action: "history"; conversation_uuid: string }
  | { action: "list" }
  | { action: "create"; name?: string }
  | { action: "delete"; conversation_uuid: string }
  | { action: "rename"; conversation_uuid: string; name: string };

export type WsHandler = (data: Record<string, unknown>) => void;

export function useWs(onMessage: WsHandler) {
  const wsRef = useRef<WebSocket | null>(null);
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      const token = getToken();
      if (token) {
        ws.send(JSON.stringify({ action: "auth", token }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handlerRef.current(data);
      } catch {}
    };

    ws.onerror = ws.onclose = () => {
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    connect();
    const reconnectInterval = setInterval(connect, 3000);
    return () => {
      clearInterval(reconnectInterval);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((msg: WsAction) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { send, connected: () => wsRef.current?.readyState === WebSocket.OPEN };
}