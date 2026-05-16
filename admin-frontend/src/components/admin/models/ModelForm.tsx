"use client";

import { useState } from "react";
import { toast } from "sonner";
import * as modelsApi from "@/lib/api/admin-models";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { LlmModel, Namespace } from "@/types/admin";

interface ModelFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingModel?: LlmModel | null;
  namespaces: Namespace[];
}

export function ModelForm({ open, onClose, onSuccess, editingModel, namespaces }: ModelFormProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    namespaceId: editingModel?.namespaceId || 0,
    name: editingModel?.name || "",
    provider: editingModel?.provider || "",
    modelName: editingModel?.modelName || "",
    apiKey: editingModel?.apiKey || "",
    baseUrl: editingModel?.baseUrl || "",
    maxTokens: editingModel?.maxTokens || 4096,
    temperature: editingModel?.temperature || 0.7,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingModel) {
        await modelsApi.updateModel(editingModel.id, form);
      } else {
        await modelsApi.createModel(form);
      }
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
            <Label htmlFor="namespaceId">Namespace</Label>
            <Select
              value={String(form.namespaceId)}
              onValueChange={(val) => setForm({ ...form, namespaceId: Number(val) })}
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
            <Label htmlFor="modelName">Model Name</Label>
            <Input
              id="modelName"
              value={form.modelName}
              onChange={(e) => setForm({ ...form, modelName: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              value={form.apiKey}
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="baseUrl">Base URL</Label>
            <Input
              id="baseUrl"
              value={form.baseUrl}
              onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxTokens">Max Tokens</Label>
              <Input
                id="maxTokens"
                type="number"
                value={form.maxTokens}
                onChange={(e) => setForm({ ...form, maxTokens: Number(e.target.value) })}
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
