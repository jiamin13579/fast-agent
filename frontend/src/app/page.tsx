"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/layout";
import { getToken } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  Send,
  Plus,
  MessageCircle,
  Trash2,
  Loader2,
  Sparkles,
  Clock,
  Key,
  Palette,
  ChevronLeft,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: Date;
}

interface Chat {
  id: number;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

const API_BASE = "http://localhost:8080/api";

// ============ CHAT VIEW ============
function ChatView() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [chatId, setChatId] = useState<number | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingChats, setLoadingChats] = useState(true);
  const [chatListCollapsed, setChatListCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadChats();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const loadChats = async () => {
    setLoadingChats(true);
    try {
      const res = await fetch(`${API_BASE}/chat/list`);
      const data = await res.json();
      setChats(data);
      if (data.length > 0) {
        selectChat(data[0].id);
      }
    } catch (e) {
      toast.error("加载会话失败");
    } finally {
      setLoadingChats(false);
    }
  };

  const selectChat = async (id: number) => {
    setChatId(id);
    setMessages([]);
    try {
      const res = await fetch(`${API_BASE}/chat/history/${id}`);
      const data = await res.json();
      setMessages(data.map((m: any) => ({
        id: `${m.role}-${Date.now()}-${Math.random()}`,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt ? new Date(m.createdAt) : undefined,
      })));
    } catch (e) {
      console.error("Failed to load history:", e);
    }
  };

  const createChat = async () => {
    try {
      const res = await fetch(`${API_BASE}/chat/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "新对话" }),
      });
      const chat = await res.json();
      setChats([...chats, chat]);
      selectChat(chat.id);
    } catch (e) {
      toast.error("创建失败");
    }
  };

  const deleteChat = async (e: React.MouseEvent, chatIdToDelete: number) => {
    e.stopPropagation();
    try {
      await fetch(`${API_BASE}/chat/delete/${chatIdToDelete}`, { method: "DELETE" });
      const newChats = chats.filter(c => c.id !== chatIdToDelete);
      setChats(newChats);
      if (chatId === chatIdToDelete && newChats.length > 0) {
        selectChat(newChats[0].id);
      } else if (newChats.length === 0) {
        setChatId(null);
        setMessages([]);
      }
    } catch (e) {
      toast.error("删除失败");
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !chatId) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    const textToSend = input;
    setInput("");
    setLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const res = await fetch(`${API_BASE}/chat/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, message: textToSend }),
      });
      const data = await res.json();

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.response || data.message || "无响应",
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (e) {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "发送失败: " + (e as Error).message,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  };

  const formatTime = (date?: Date) => {
    if (!date) return "";
    return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  };

  const openSettings = () => {
    // Settings now accessible via sidebar
  };

  return (
    <div className="flex flex-1 h-full min-h-0">
      {/* Chat List Sidebar: hidden when collapsed */}
      <aside className={cn(
        "flex flex-col h-full bg-white border-r border-blue-100 shrink-0 transition-all duration-300 overflow-hidden",
        chatListCollapsed ? "w-0" : "w-64"
      )}>
        <div className="h-14 px-4 flex items-center border-b border-blue-100 shrink-0">
          <h2 className="font-medium text-blue-600 text-sm">对话</h2>
        </div>

        <div className="p-3 border-b border-blue-100 shrink-0">
          <Button
            onClick={createChat}
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg h-9 text-sm font-medium shadow-md"
          >
            <Plus className="h-4 w-4 mr-2" />
            新对话
          </Button>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-2 space-y-1">
            {loadingChats ? (
              <div className="space-y-2 p-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 rounded-lg bg-blue-50 animate-pulse" />
                ))}
              </div>
            ) : chats.length === 0 ? (
              <div className="text-center py-8 text-blue-400/50 text-xs">
                暂无对话
              </div>
            ) : (
              chats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => selectChat(chat.id)}
                  className={cn(
                    "group relative w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-200 cursor-pointer",
                    chatId === chat.id
                      ? "bg-blue-50 border border-blue-200"
                      : "hover:bg-blue-50/50 border border-transparent"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "font-medium truncate text-sm",
                        chatId === chat.id ? "text-blue-700" : "text-blue-600"
                      )}>
                        {chat.name}
                      </p>
                      {chat.updatedAt && (
                        <p className="text-xs text-blue-400/60 mt-0.5">
                          {new Date(chat.updatedAt).toLocaleDateString("zh-CN")}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => deleteChat(e, chat.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-red-50 text-blue-400/60 hover:text-red-500 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </aside>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-blue-50/30 min-h-0">
        {/* Header */}
        <header className="h-14 px-4 flex items-center bg-white border-b border-blue-100 shrink-0 gap-3">
          <button
            onClick={() => setChatListCollapsed(!chatListCollapsed)}
            className="p-1 rounded hover:bg-blue-100 text-blue-500 transition-colors"
            title={chatListCollapsed ? "展开对话列表" : "收起对话列表"}
          >
            {chatListCollapsed ? (
              <Menu className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
            <Badge
              variant="secondary"
              className="bg-blue-50 text-blue-600 border-blue-200 px-3 py-1 rounded-full text-xs font-medium"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5 animate-pulse" />
              MiniMax-M2.7
            </Badge>
            <h2 className="font-medium text-blue-500 text-sm">
              {chats.find((c) => c.id === chatId)?.name || "选择对话"}
            </h2>
        </header>

        {/* Messages */}
        <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
          <div className="max-w-3xl mx-auto px-6 py-6">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-cyan-100 border border-blue-200 flex items-center justify-center mb-5 shadow-sm">
                  <MessageCircle className="h-8 w-8 text-blue-500" />
                </div>
                <h3 className="text-lg font-medium text-blue-600 mb-2">开始对话</h3>
                <p className="text-blue-400/60 text-xs max-w-xs">
                  向私人助手发送消息，开始智能对话
                </p>
              </div>
            )}

            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300",
                    message.role === "user" && "flex-row-reverse"
                  )}
                >
                  <Avatar className={cn(
                    "h-9 w-9 rounded-xl flex-shrink-0 shadow-sm",
                    message.role === "user"
                      ? "bg-gradient-to-br from-blue-500 to-cyan-500"
                      : "bg-gradient-to-br from-blue-400 to-cyan-400"
                  )}>
                    <AvatarFallback className="text-white font-semibold text-sm">
                      {message.role === "user" ? "我" : "AI"}
                    </AvatarFallback>
                  </Avatar>

                  <div className={cn(
                    "flex-1 max-w-[75%]",
                    message.role === "user" && "flex flex-col items-end"
                  )}>
                    <div
                      className={cn(
                        "rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-sm",
                        message.role === "user"
                          ? "bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-br-md shadow-md shadow-blue-200"
                          : "bg-white text-blue-700 rounded-bl-md border border-blue-100"
                      )}
                    >
                      {message.content}
                    </div>
                    {message.createdAt && (
                      <span className="text-[10px] text-blue-400/60 mt-1.5 px-1">
                        {formatTime(message.createdAt)}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex gap-4">
                  <Avatar className="h-9 w-9 rounded-xl flex-shrink-0 bg-gradient-to-br from-blue-400 to-cyan-400">
                    <AvatarFallback className="text-white font-semibold text-sm">AI</AvatarFallback>
                  </Avatar>
                  <div className="rounded-2xl rounded-bl-md bg-white border border-blue-100 px-5 py-4 shadow-sm">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-blue-100 shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="relative bg-white rounded-2xl border border-blue-200 shadow-md shadow-blue-100/50 focus-within:shadow-lg focus-within:border-blue-300 transition-all duration-200">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="输入消息... (Shift + Enter 换行)"
                className="w-full px-5 py-4 pr-14 resize-none bg-transparent rounded-2xl text-sm text-blue-700 placeholder:text-blue-400/60 focus:outline-none max-h-32"
                disabled={!chatId}
                rows={1}
              />
              <div className="absolute right-3 bottom-3 flex items-center gap-2">
                <span className="text-[10px] text-blue-400/60 hidden sm:block">
                  {input.length > 0 ? `${input.length} 字` : ""}
                </span>
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim() || !chatId || loading}
                  size="icon"
                  className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-lg shadow-blue-200 disabled:shadow-none transition-all"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-[10px] text-center text-blue-400/50 mt-2">
              私人助手可能会产生不准确的信息，请自行核实
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ SETTINGS VIEW ============
function SettingsView() {
  const { view } = useApp();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    llmProvider: "MiniMax-M2.7",
    llmApiKey: "",
    llmBaseUrl: "https://api.minimax.chat",
    theme: "light",
    notifications: true,
    soundEnabled: true,
  });

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 1000));
    toast.success("保存成功");
    setSaving(false);
  };

  return (
    <div className="flex-1 overflow-auto bg-blue-50/50 min-h-0">
      <div className="max-w-3xl mx-auto p-8">
        {/* Skills */}
        {view === "skills" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-blue-600 font-medium text-sm">技能管理</h3>
                <p className="text-blue-400/60 text-xs mt-1">管理系统技能</p>
              </div>
              <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg border border-blue-400 text-xs shadow-sm">
                <Plus className="h-3 w-3 mr-1.5" />
                添加
              </Button>
            </div>
            <Card className="bg-white border border-blue-100 rounded-lg p-6 text-center shadow-sm">
              <Sparkles className="h-6 w-6 mx-auto mb-2 text-blue-300" />
              <p className="text-blue-400/50 text-xs">暂无技能</p>
            </Card>
          </div>
        )}

        
        {/* Tasks */}
        {view === "tasks" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-blue-600 font-medium text-sm">定时任务</h3>
                <p className="text-blue-400/60 text-xs mt-1">管理定时执行的任务</p>
              </div>
              <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg border border-blue-400 text-xs shadow-sm">
                <Plus className="h-3 w-3 mr-1.5" />
                添加
              </Button>
            </div>
            <Card className="bg-white border border-blue-100 rounded-lg p-6 text-center shadow-sm">
              <Clock className="h-6 w-6 mx-auto mb-2 text-blue-300" />
              <p className="text-blue-400/50 text-xs">暂无定时任务</p>
            </Card>
          </div>
        )}

        
        {/* LLM */}
        {view === "llm" && (
          <div className="space-y-4">
            <h3 className="text-blue-600 font-medium text-sm">LLM 配置</h3>
            <Card className="bg-white border border-blue-100 rounded-lg p-4 space-y-3 shadow-sm">
              <div>
                <label className="text-xs text-blue-500/70 mb-1 block uppercase tracking-wide">模型</label>
                <Select value={formData.llmProvider} onValueChange={(v) => setFormData({ ...formData, llmProvider: v || "" })}>
                  <SelectTrigger className="bg-blue-50 border-blue-200 text-blue-600 rounded-lg h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-blue-200">
                    <SelectItem value="MiniMax-M2.7">MiniMax-M2.7</SelectItem>
                    <SelectItem value="GPT-4">GPT-4</SelectItem>
                    <SelectItem value="Claude-3">Claude-3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-blue-500/70 mb-1 block uppercase tracking-wide">API Key</label>
                <Input type="password" value={formData.llmApiKey} onChange={(e) => setFormData({ ...formData, llmApiKey: e.target.value })} placeholder="sk-..." className="bg-blue-50 border-blue-200 text-blue-600 rounded-lg h-9 text-sm" />
              </div>
              <div>
                <label className="text-xs text-blue-500/70 mb-1 block uppercase tracking-wide">Base URL</label>
                <Input value={formData.llmBaseUrl} onChange={(e) => setFormData({ ...formData, llmBaseUrl: e.target.value })} placeholder="https://api.minimax.chat" className="bg-blue-50 border-blue-200 text-blue-600 rounded-lg h-9 text-sm" />
              </div>
              <Button onClick={handleSave} disabled={saving} size="sm" className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium h-9 shadow-sm">
                {saving ? <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" />保存中...</> : "保存"}
              </Button>
            </Card>
          </div>
        )}

        {/* Preferences */}
        {view === "preferences" && (
          <div className="space-y-4">
            <h3 className="text-blue-600 font-medium text-sm">偏好设置</h3>
            <Card className="bg-white border border-blue-100 rounded-lg p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-blue-600 text-sm">深色模式</p>
                  <p className="text-blue-400/60 text-xs">切换主题</p>
                </div>
                <Switch checked={formData.theme === "dark"} onCheckedChange={(checked) => setFormData({ ...formData, theme: checked ? "dark" : "light" })} className="data-[state=checked]:bg-blue-500" />
              </div>
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-blue-600 text-sm">通知</p>
                  <p className="text-blue-400/60 text-xs">任务完成通知</p>
                </div>
                <Switch checked={formData.notifications} onCheckedChange={(checked) => setFormData({ ...formData, notifications: checked })} className="data-[state=checked]:bg-blue-500" />
              </div>
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-blue-600 text-sm">提示音</p>
                  <p className="text-blue-400/60 text-xs">消息提示</p>
                </div>
                <Switch checked={formData.soundEnabled} onCheckedChange={(checked) => setFormData({ ...formData, soundEnabled: checked })} className="data-[state=checked]:bg-blue-500" />
              </div>
              <Button onClick={handleSave} disabled={saving} size="sm" className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium h-9 shadow-sm">
                {saving ? <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" />保存中...</> : "保存"}
              </Button>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ MAIN PAGE ============
export default function HomePage() {
  const router = useRouter();
  const { view } = useApp();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      router.replace("/chat");
    } else {
      router.replace("/login");
    }
  }, [router]);

  // Chat tab shows chat interface, others show settings content
  if (view === "chat") {
    return <ChatView />;
  }
  return <SettingsView />;
}