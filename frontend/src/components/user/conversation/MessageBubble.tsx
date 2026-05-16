"use client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Props {
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: string;
}

export function MessageBubble({ role, content, createdAt }: Props) {
  return (
    <div className={cn("flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300", role === "user" && "flex-row-reverse")}>
      <Avatar className={cn(
        "h-9 w-9 rounded-xl flex-shrink-0 shadow-sm",
        role === "user" ? "bg-gradient-to-br from-blue-500 to-cyan-500" : "bg-gradient-to-br from-blue-400 to-cyan-400"
      )}>
        <AvatarFallback className="text-white font-semibold text-sm">
          {role === "user" ? "我" : role === "system" ? "系统" : "AI"}
        </AvatarFallback>
      </Avatar>

      <div className={cn("flex-1 max-w-[75%]", role === "user" && "flex flex-col items-end")}>
        <div className={cn(
          "rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-sm",
          role === "user"
            ? "bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-br-md shadow-md shadow-blue-200"
            : "bg-white text-blue-700 rounded-bl-md border border-blue-100"
        )}>
          {content}
        </div>
        {createdAt && (
          <span className="text-[10px] text-blue-400/60 mt-1.5 px-1">
            {new Date(createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>
    </div>
  );
}
