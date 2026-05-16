"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConversationItem } from "./ConversationItem";
import type { Conversation } from "@/types/chat";

interface Props {
  conversations: Conversation[];
  selectedUuid: string | null;
  loading: boolean;
  onSelect: (uuid: string) => void;
  onCreate: () => void;
  onRename: (uuid: string, name: string) => Promise<void>;
  onDelete: (uuid: string) => Promise<void>;
}

export function ConversationSidebar({ conversations, selectedUuid, loading, onSelect, onCreate, onRename, onDelete }: Props) {
  return (
    <aside className="flex flex-col h-full bg-white border-r border-blue-100 w-64 shrink-0">
      <div className="h-14 px-4 flex items-center border-b border-blue-100 shrink-0">
        <h2 className="font-medium text-blue-600 text-sm">对话</h2>
      </div>

      <div className="p-3 border-b border-blue-100 shrink-0">
        <Button onClick={onCreate} className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg h-9 text-sm font-medium shadow-md">
          <Plus className="h-4 w-4 mr-2" />
          新对话
        </Button>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-1">
          {loading ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-lg bg-blue-50 animate-pulse" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-blue-400/50 text-xs">暂无对话</div>
          ) : (
            conversations.map((conv) => (
              <ConversationItem
                key={conv.uuid}
                uuid={conv.uuid}
                name={conv.name}
                updatedAt={conv.updatedAt}
                isSelected={selectedUuid === conv.uuid}
                onSelect={() => onSelect(conv.uuid)}
                onRename={(name) => onRename(conv.uuid, name)}
                onDelete={() => onDelete(conv.uuid)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
