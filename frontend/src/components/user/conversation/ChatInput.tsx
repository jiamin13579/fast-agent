"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

interface Props {
  onSend: (content: string) => void;
  disabled?: boolean;
  loading?: boolean;
}

export function ChatInput({ onSend, disabled, loading }: Props) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!input.trim() || disabled || loading) return;
    onSend(input);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  };

  return (
    <div className="p-4 bg-white border-t border-blue-100 shrink-0">
      <div className="max-w-3xl mx-auto">
        <div className="relative bg-white rounded-2xl border border-blue-200 shadow-md shadow-blue-100/50 focus-within:shadow-lg focus-within:border-blue-300 transition-all duration-200">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="输入消息... (Shift + Enter 换行)"
            className="w-full px-5 py-4 pr-14 resize-none bg-transparent rounded-2xl text-sm text-blue-700 placeholder:text-blue-400/60 focus:outline-none max-h-32"
            disabled={disabled}
            rows={1}
          />
          <div className="absolute right-3 bottom-3">
            <Button
              onClick={handleSend}
              disabled={!input.trim() || disabled || loading}
              size="icon"
              className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-lg shadow-blue-200 disabled:shadow-none transition-all"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-[10px] text-center text-blue-400/50 mt-2">私人助手可能会产生不准确的信息，请自行核实</p>
      </div>
    </div>
  );
}
