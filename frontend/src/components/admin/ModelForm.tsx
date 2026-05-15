"use client";

import { useState, useEffect } from "react";
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

interface Model {
  id: number;
  namespace_id: number;
  name: string;
  provider: string;
  model_name: string;
  api_key: string;
  base_url: string;
  max_tokens: number;
  temperature: number;
  status: number;
}

interface Namespace {
  id: number;
  code: string;
  name: string;
}

interface ModelFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingModel?: Model | null;
  namespaces: Namespace[];
}

export function ModelForm({ open, onClose, onSuccess, editingModel, namespaces }: ModelFormProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    namespace_id: editingModel?.namespace_id || 0,
    name: editingModel?.name || "",
    provider: editingModel?.provider || "",
    model_name: editingModel?.model_name || "",
    api_key: editingModel?.api_key || "",
    base_url: editingModel?.base_url || "",
    max_tokens: editingModel?.max_tokens || 4096,
    temperature: editingModel?.temperature || 0.7,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editingModel
        ? `/api/admin/models/${editingModel.id}`
        : `/api/admin/models`;
      const method = editingModel ? "PUT" : "POST";

      await api[method === "PUT" ? "put" : "post"](url, form);
      toast.success(editingModel ? "更新成功" : "创建成功");
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
          <DialogTitle>{editingModel ? "编辑模型" : "新建模型"}</DialogTitle>
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
            <Label htmlFor="provider">Provider</Label>
            <Input
              id="provider"
              value={form.provider}
              onChange={(e) => setForm({ ...form, provider: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model_name">Model Name</Label>
            <Input
              id="model_name"
              value={form.model_name}
              onChange={(e) => setForm({ ...form, model_name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="api_key">API Key</Label>
            <Input
              id="api_key"
              type="password"
              value={form.api_key}
              onChange={(e) => setForm({ ...form, api_key: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="base_url">Base URL</Label>
            <Input
              id="base_url"
              value={form.base_url}
              onChange={(e) => setForm({ ...form, base_url: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_tokens">Max Tokens</Label>
              <Input
                id="max_tokens"
                type="number"
                value={form.max_tokens}
                onChange={(e) => setForm({ ...form, max_tokens: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="temperature">Temperature</Label>
              <Input
                id="temperature"
                type="number"
                step="0.1"
                value={form.temperature}
                onChange={(e) => setForm({ ...form, temperature: Number(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "提交中..." : editingModel ? "更新" : "创建"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}