"use client";

import { useEffect, useCallback } from "react";
import { onEvent, offEvent, joinRoom, leaveRoom, disconnectSocket } from "@/lib/socket";

interface StreamEvent {
  type: "start" | "chunk" | "done" | "error";
  content?: string;
  client_msg_id?: string;
  message_uuid?: string;
  message?: string;
}

export function useSocket() {
  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, []);

  const onStreamEvent = useCallback((handler: (data: StreamEvent) => void) => {
    const wrapped = (...args: unknown[]) => {
      handler(args[0] as StreamEvent);
    };
    onEvent("stream_event", wrapped);
    return () => offEvent("stream_event", wrapped);
  }, []);

  return { onStreamEvent, joinRoom, leaveRoom };
}
