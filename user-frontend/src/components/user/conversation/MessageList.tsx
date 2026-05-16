"use client";

import { useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./MessageBubble";
import { MessageCircle } from "lucide-react";
import type { Message } from "@/types/chat";

interface Props {
  messages: Message[];
  streaming: boolean;
}

function LoadingDots() {
  return (
    <div className="flex gap-4 items-start">
      <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center shadow-sm">
        <span className="text-white font-semibold text-sm">AI</span>
      </div>
      <div className="rounded-2xl rounded-bl-md bg-white border border-blue-100 px-5 py-4 shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-transparent to-cyan-50 animate-pulse" />
        <div className="relative flex gap-1.5 items-center">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "200ms" }} />
          <span className="w-2.5 h-2.5 rounded-full bg-blue-300 animate-bounce" style={{ animationDelay: "400ms" }} />
        </div>
      </div>
    </div>
  );
}

export function MessageList({ messages, streaming }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0 && !streaming) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-cyan-100 border border-blue-200 flex items-center justify-center mb-5 shadow-sm mx-auto">
            <MessageCircle className="h-8 w-8 text-blue-500" />
          </div>
          <h3 className="text-lg font-medium text-blue-600 mb-2">开始对话</h3>
          <p className="text-blue-400/60 text-xs max-w-xs">向私人助手发送消息，开始智能对话</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
      <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
        {messages.map((msg) => (
          <MessageBubble key={msg.uuid} role={msg.role} content={msg.content} createdAt={msg.createdAt} />
        ))}
        {streaming && <LoadingDots />}
      </div>
    </ScrollArea>
  );
}
