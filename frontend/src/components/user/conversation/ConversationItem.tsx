"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Props {
  uuid: string;
  name: string;
  updatedAt?: string;
  isSelected: boolean;
  onSelect: () => void;
  onRename: (name: string) => Promise<void>;
  onDelete: () => Promise<void>;
}

export function ConversationItem({ uuid, name, updatedAt, isSelected, onSelect, onRename, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name);

  const handleSave = async () => {
    if (!editName.trim()) return;
    await onRename(editName.trim());
    setEditing(false);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await onDelete();
  };

  return (
    <div
      onClick={onSelect}
      className={cn(
        "group relative w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-200 cursor-pointer",
        isSelected
          ? "bg-blue-50 border border-blue-200"
          : "hover:bg-blue-50/50 border border-transparent"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {editing ? (
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") setEditing(false);
              }}
              className="h-7 text-xs px-2 py-1 bg-white"
              autoFocus
            />
          ) : (
            <>
              <p className={cn("font-medium truncate text-sm", isSelected ? "text-blue-700" : "text-blue-600")}>
                {name}
              </p>
              {updatedAt && (
                <p className="text-xs text-blue-400/60 mt-0.5">
                  {new Date(updatedAt).toLocaleString("zh-CN")}
                </p>
              )}
            </>
          )}
        </div>
        {!editing && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); setEditing(true); setEditName(name); }}
              className="p-1.5 rounded-md hover:bg-blue-100 text-blue-400/60 hover:text-blue-600"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button onClick={handleDelete} className="p-1.5 rounded-md hover:bg-red-50 text-blue-400/60 hover:text-red-500">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
