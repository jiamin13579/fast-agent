"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/layout";
import { api } from "@/lib/api";
import { clearAuth, getToken } from "@/lib/auth";
import { joinRoom, leaveRoom, onEvent, offEvent } from "@/lib/socket";
import { cn } from "@/lib/utils";
import {
  Send,
  Plus,
  MessageCircle,
  Trash2,
  Loader2,
  ChevronLeft,
  Menu,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AgentSelect } from "@/components/AgentSelect";
import { ModelSelect } from "@/components/ModelSelect";
import { toast } from "sonner";

interface Message {
  uuid: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: Date;
}

interface ConversationItem {
  uuid: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

interface MessageDto {
  uuid: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
}

// ============ CONVERSATION VIEW ============
function ConversationView() {
  const { currentNamespaceId, isAdmin } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [conversationUuid, setConversationUuid] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [conversationListCollapsed, setConversationListCollapsed] = useState(false);
  const [editingConversationUuid, setEditingConversationUuid] = useState<string | null>(null);
  const [editingConversationName, setEditingConversationName] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [agents, setAgents] = useState<{ id: number; name: string }[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [availableModels, setAvailableModels] = useState<{ id: number; name: string }[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);

  const handleWsMessage = useCallback((data: Record<string, unknown>) => {
    const type = data.type as string;
    const clientMsgId = data.client_msg_id as string;

    if (type === "start") {
      // 已开始，等待 chunk 累积
    } else if (type === "chunk") {
      const content = data.content as string;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.uuid === clientMsgId) {
          return [...prev.slice(0, -1), { ...last, content: last.content + content }];
        }
        return [...prev, { uuid: clientMsgId || String(Date.now()), role: "assistant" as const, content }];
      });
    } else if (type === "done") {
      setLoading(false);
    } else if (type === "error") {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === "assistant") {
          return [...prev.slice(0, -1), { ...last, content: last.content + "\n[错误] " + data.message }];
        }
        return prev;
      });
      setLoading(false);
    }
  }, []);

  // Socket event handling
  useEffect(() => {
    const handleStreamEvent = (...args: unknown[]) => {
      const data = args[0] as Record<string, unknown>;
      handleWsMessage(data);
    };

    onEvent("stream_event", handleStreamEvent);

    return () => {
      offEvent("stream_event", handleStreamEvent);
    };
  }, [handleWsMessage]);

  // Join/leave rooms when conversation changes
  useEffect(() => {
    if (conversationUuid) {
      joinRoom(`conversation:${conversationUuid}`);
      joinRoom(`agent:${conversationUuid}`);

      return () => {
        leaveRoom(`conversation:${conversationUuid}`);
        leaveRoom(`agent:${conversationUuid}`);
      };
    }
  }, [conversationUuid]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load agents when namespace changes
  useEffect(() => {
    if (!currentNamespaceId) return;
    api.get<{ id: number; name: string }[]>(`/api/agents?namespace_id=${currentNamespaceId}`)
      .then(data => {
        setAgents(data);
        if (data.length > 0) setSelectedAgentId(data[0].id);
      }).catch(console.error);
  }, [currentNamespaceId]);

  // Load models when agent changes
  useEffect(() => {
    if (!selectedAgentId) return;
    api.get<{ resource_id: number }[]>(`/api/agents/${selectedAgentId}/resources?type=MODEL`)
      .then(data => {
        const modelIds = data.map((r) => r.resource_id);
        if (isAdmin && modelIds.length > 0) {
          api.get<{ id: number; name: string }[]>(`/api/admin/models?namespace_id=${currentNamespaceId}`)
            .then(allModels => {
              const filtered = allModels.filter((m) => modelIds.includes(m.id));
              setAvailableModels(filtered);
            }).catch(() => setAvailableModels(modelIds.map((id: number) => ({ id, name: `模型 ${id}` }))));
        } else {
          setAvailableModels(modelIds.map((id: number) => ({ id, name: `模型 ${id}` })));
        }
      }).catch(console.error);
  }, [selectedAgentId, currentNamespaceId, isAdmin]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const selectConversation = useCallback(async (uuid: string) => {
    setConversationUuid(uuid);
    setMessages([]);
    try {
      const data: MessageDto[] = await api.get(`/api/conversations/${uuid}/messages`);
      setMessages(
        data.map((m) => ({
          uuid: m.uuid,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt ? new Date(m.createdAt) : undefined,
        }))
      );
    } catch (e) {
      console.error("Failed to load history:", e);
    }
  }, []);

  const loadConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const data = await api.get<ConversationItem[]>("/api/conversations");
      setConversations(data);
      if (data.length > 0) {
        await selectConversation(data[0].uuid);
      }
    } catch (e) {
      if (e instanceof Error && (e.message.includes("401") || e.message.includes("403"))) {
        clearAuth();
        window.location.href = "/login";
        return;
      }
      toast.error("加载会话失败");
    } finally {
      setLoadingConversations(false);
    }
  }, [selectConversation]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  const createConversation = async () => {
    try {
      const conversation = await api.post<ConversationItem>("/api/conversations", {
        name: "新对话",
        agent_id: selectedAgentId,
        model_id: selectedModelId,
        namespace_id: currentNamespaceId,
      });
      setConversations((prev) => [...prev, conversation]);
      selectConversation(conversation.uuid);
    } catch {
      toast.error("创建失败");
    }
  };

  const deleteConversation = async (e: React.MouseEvent, conversationUuidToDelete: string) => {
    e.stopPropagation();
    try {
      await api.delete(`/api/conversations/${conversationUuidToDelete}`);
      const newConversations = conversations.filter((c) => c.uuid !== conversationUuidToDelete);
      setConversations(newConversations);
      if (conversationUuid === conversationUuidToDelete && newConversations.length > 0) {
        selectConversation(newConversations[0].uuid);
      } else if (newConversations.length === 0) {
        setConversationUuid(null);
        setMessages([]);
      }
    } catch {
      toast.error("删除失败");
    }
  };

  const startRenameConversation = (e: React.MouseEvent, conv: ConversationItem) => {
    e.stopPropagation();
    setEditingConversationUuid(conv.uuid);
    setEditingConversationName(conv.name);
  };

  const saveRenameConversation = async () => {
    if (!editingConversationUuid || !editingConversationName.trim()) return;
    try {
      await api.put(`/api/conversations/${editingConversationUuid}`, { name: editingConversationName.trim() });
      setConversations((prev) =>
        prev.map((c) =>
          c.uuid === editingConversationUuid ? { ...c, name: editingConversationName.trim() } : c
        )
      );
      setEditingConversationUuid(null);
      setEditingConversationName("");
      toast.success("已重命名");
    } catch {
      toast.error("重命名失败");
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !conversationUuid) return;

    const textToSend = input;
    setInput("");
    setLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const userMsgId = String(Date.now());
    const assistantMsgId = userMsgId + "_assistant";

    // 添加用户消息
    setMessages((prev) => [
      ...prev,
      { uuid: userMsgId, role: "user", content: textToSend },
    ]);

    // 添加助手占位消息
    setMessages((prev) => [
      ...prev,
      { uuid: assistantMsgId, role: "assistant", content: "" },
    ]);

    // Send via HTTP
    try {
      await api.post(`/api/conversations/${conversationUuid}/messages`, { content: textToSend, client_msg_id: assistantMsgId });
    } catch (e) {
      console.error("Send message error:", e);
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === "assistant") {
          return [...prev.slice(0, -1), { ...last, content: last.content + "\n[错误] 发送失败" }];
        }
        return prev;
      });
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
    return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const getLastUserMessageUuid = () => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") return messages[i].uuid;
    }
    return null;
  };

  const lastUserMessageUuid = getLastUserMessageUuid();

  return (
    <div className="flex flex-1 h-full min-h-0">
      {/* Conversation list sidebar: hidden when collapsed */}
      <aside
        className={cn(
          "flex flex-col h-full bg-white border-r border-blue-100 shrink-0 transition-all duration-300 overflow-hidden",
          conversationListCollapsed ? "w-0" : "w-64"
        )}
      >
        <div className="h-14 px-4 flex items-center border-b border-blue-100 shrink-0">
          <h2 className="font-medium text-blue-600 text-sm">对话</h2>
        </div>

        <div className="p-3 border-b border-blue-100 shrink-0">
          <Button
            onClick={createConversation}
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg h-9 text-sm font-medium shadow-md"
          >
            <Plus className="h-4 w-4 mr-2" />
            新对话
          </Button>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-2 space-y-1">
            {loadingConversations ? (
              <div className="space-y-2 p-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 rounded-lg bg-blue-50 animate-pulse" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8 text-blue-400/50 text-xs">暂无对话</div>
            ) : (
              conversations.map((conversation) => (
                <div
                  key={conversation.uuid}
                  onClick={() => selectConversation(conversation.uuid)}
                  className={cn(
                    "group relative w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-200 cursor-pointer",
                    conversationUuid === conversation.uuid
                      ? "bg-blue-50 border border-blue-200"
                      : "hover:bg-blue-50/50 border border-transparent"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {editingConversationUuid === conversation.uuid ? (
                        <div className="flex flex-col gap-1">
                          <Input
                            value={editingConversationName}
                            onChange={(e) => setEditingConversationName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveRenameConversation();
                              if (e.key === "Escape") {
                                setEditingConversationUuid(null);
                                setEditingConversationName("");
                              }
                            }}
                            className="h-7 text-xs px-2 py-1 bg-white"
                            autoFocus
                          />
                          <div className="flex gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                saveRenameConversation();
                              }}
                              className="text-[10px] text-blue-500 hover:text-blue-700"
                            >
                              保存
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingConversationUuid(null);
                                setEditingConversationName("");
                              }}
                              className="text-[10px] text-blue-400/60 hover:text-blue-600"
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p
                            className={cn(
                              "font-medium truncate text-sm",
                              conversationUuid === conversation.uuid ? "text-blue-700" : "text-blue-600"
                            )}
                          >
                            {conversation.name}
                          </p>
                          {conversation.updatedAt && (
                            <p className="text-xs text-blue-400/60 mt-0.5">
                              {new Date(conversation.updatedAt).toLocaleString("zh-CN")}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    {!editingConversationUuid && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => startRenameConversation(e, conversation)}
                          className="p-1.5 rounded-md hover:bg-blue-100 text-blue-400/60 hover:text-blue-600 transition-all"
                          title="重命名"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => deleteConversation(e, conversation.uuid)}
                          className="p-1.5 rounded-md hover:bg-red-50 text-blue-400/60 hover:text-red-500 transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </aside>

      {/* Conversation area */}
      <div className="flex-1 flex flex-col bg-blue-50/30 min-h-0">
        {/* Header */}
        <header className="h-14 px-4 flex items-center bg-white border-b border-blue-100 shrink-0 gap-3">
          <button
            onClick={() => setConversationListCollapsed(!conversationListCollapsed)}
            className="p-1 rounded hover:bg-blue-100 text-blue-500 transition-colors"
            title={conversationListCollapsed ? "展开对话列表" : "收起对话列表"}
          >
            {conversationListCollapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
          <AgentSelect
            agents={agents}
            value={selectedAgentId}
            onChange={(id) => { setSelectedAgentId(id); setSelectedModelId(null); }}
            placeholder="选择 Agent"
          />
          {selectedAgentId && (
            <ModelSelect
              models={availableModels}
              value={selectedModelId}
              onChange={setSelectedModelId}
              placeholder="选择模型"
            />
          )}
          <h2 className="font-medium text-blue-500 text-sm ml-auto">
            {conversations.find((c) => c.uuid === conversationUuid)?.name || "选择对话"}
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
                  key={message.uuid}
                  className={cn(
                    "flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300",
                    message.role === "user" && "flex-row-reverse"
                  )}
                >
                  <Avatar
                    className={cn(
                      "h-9 w-9 rounded-xl flex-shrink-0 shadow-sm",
                      message.role === "user"
                        ? "bg-gradient-to-br from-blue-500 to-cyan-500"
                        : "bg-gradient-to-br from-blue-400 to-cyan-400"
                    )}
                  >
                    <AvatarFallback className="text-white font-semibold text-sm">
                      {message.role === "user" ? "我" : "AI"}
                    </AvatarFallback>
                  </Avatar>

                  <div
                    className={cn(
                      "flex-1 max-w-[75%]",
                      message.role === "user" && "flex flex-col items-end"
                    )}
                  >
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
                <div className="flex gap-4 items-start">
                  <Avatar className="h-9 w-9 rounded-xl flex-shrink-0 bg-gradient-to-br from-blue-400 to-cyan-400">
                    <AvatarFallback className="text-white font-semibold text-sm">AI</AvatarFallback>
                  </Avatar>
                  <div className="rounded-2xl rounded-bl-md bg-white border border-blue-100 px-5 py-4 shadow-sm relative overflow-hidden">
                    {/* Pulse ring effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-transparent to-cyan-50 animate-pulse-bg" />
                    <div className="relative flex gap-1.5 items-center">
                      <span className="relative w-2.5 h-2.5 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 animate-ping-slow shadow-sm" style={{ animationDelay: "0ms" }} />
                      <span className="relative w-2.5 h-2.5 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 animate-ping-slow shadow-sm" style={{ animationDelay: "200ms" }} />
                      <span className="relative w-2.5 h-2.5 rounded-full bg-gradient-to-br from-blue-300 to-cyan-300 animate-ping-slow shadow-sm" style={{ animationDelay: "400ms" }} />
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
                disabled={!conversationUuid}
                rows={1}
              />
              <div className="absolute right-3 bottom-3 flex items-center gap-2">
                <span className="text-[10px] text-blue-400/60 hidden sm:block">
                  {input.length > 0 ? `${input.length} 字` : ""}
                </span>
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim() || !conversationUuid || loading}
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
    theme: "light",
    notifications: true,
    soundEnabled: true,
  });

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 1000));
    toast.success("保存成功");
    setSaving(false);
  };

  return (
    <div className="flex-1 overflow-auto bg-blue-50/50 min-h-0">
      <div className="max-w-3xl mx-auto p-8">
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
                <Switch
                  checked={formData.theme === "dark"}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, theme: checked ? "dark" : "light" })
                  }
                  className="data-[state=checked]:bg-blue-500"
                />
              </div>
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-blue-600 text-sm">通知</p>
                  <p className="text-blue-400/60 text-xs">任务完成通知</p>
                </div>
                <Switch
                  checked={formData.notifications}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, notifications: checked })
                  }
                  className="data-[state=checked]:bg-blue-500"
                />
              </div>
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-blue-600 text-sm">提示音</p>
                  <p className="text-blue-400/60 text-xs">消息提示</p>
                </div>
                <Switch
                  checked={formData.soundEnabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, soundEnabled: checked })}
                  className="data-[state=checked]:bg-blue-500"
                />
              </div>
              <Button
                onClick={handleSave}
                disabled={saving}
                size="sm"
                className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium h-9 shadow-sm"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                    保存中...
                  </>
                ) : (
                  "保存"
                )}
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
    const token = getToken();
    if (!token) {
      router.replace("/login");
    }
  }, [router]);

  // Conversation tab shows conversation interface, others show settings content
  if (view === "conversation") {
    return <ConversationView />;
  }
  return <SettingsView />;
}
