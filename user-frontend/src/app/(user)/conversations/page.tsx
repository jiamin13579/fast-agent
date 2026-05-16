"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConversations } from "@/lib/hooks/use-conversations";

export default function ConversationsPage() {
  const router = useRouter();
  const { conversations, loading } = useConversations();

  useEffect(() => {
    if (!loading && conversations.length > 0) {
      router.replace(`/conversations/${conversations[0].uuid}`);
    }
  }, [conversations, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-blue-400/60">
        加载中...
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full text-blue-400/50">
      <div className="text-center">
        <h3 className="text-lg font-medium text-blue-600 mb-2">开始对话</h3>
        <p className="text-xs max-w-xs">创建一个新对话，开始智能交流</p>
      </div>
    </div>
  );
}
