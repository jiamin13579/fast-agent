"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Agent {
  id: number;
  namespace_id: number;
  name: string;
  description: string;
  system_prompt: string;
  status: number;
}

interface Namespace {
  id: number;
  code: string;
  name: string;
}

interface AgentFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingAgent?: Agent | null;
  namespaces: Namespace[];
}

export function AgentForm({ open, onClose, onSuccess, editingAgent, namespaces }: AgentFormProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    namespace_id: editingAgent?.namespace_id || 0,
    name: editingAgent?.name || "",
    description: editingAgent?.description || "",
    system_prompt: editingAgent?.system_prompt || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editingAgent
        ? `/admin/agents/${editingAgent.id}`
        : `/admin/agents`;
      const method = editingAgent ? "PUT" : "POST";

      await api[method === "PUT" ? "put" : "post"](url, form);
      toast.success(editingAgent ? "更新成功" : "创建成功");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingAgent ? "编辑 Agent" : "新建 Agent"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="namespace_id">Namespace</Label>
            <Select
              value={String(form.namespace_id)}
              onValueChange={(val) => setForm({ ...form, namespace_id: Number(val) })}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择 Namespace" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">全局 (ns=0)</SelectItem>
                {namespaces.map((ns) => (
                  <SelectItem key={ns.id} value={String(ns.id)}>
                    {ns.name} ({ns.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="system_prompt">System Prompt</Label>
            <Textarea
              id="system_prompt"
              value={form.system_prompt}
              onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "提交中..." : editingAgent ? "更新" : "创建"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}