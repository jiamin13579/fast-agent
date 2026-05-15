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

interface ModelTemplate {
  id: number;
  name: string;
  provider: string;
  model_name: string;
  base_url: string;
  max_tokens: number;
  temperature: number;
  description: string;
}

interface ModelTemplateFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingTemplate?: ModelTemplate | null;
}

export function ModelTemplateForm({ open, onClose, onSuccess, editingTemplate }: ModelTemplateFormProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: editingTemplate?.name || "",
    provider: editingTemplate?.provider || "",
    model_name: editingTemplate?.model_name || "",
    base_url: editingTemplate?.base_url || "",
    max_tokens: editingTemplate?.max_tokens || 4096,
    temperature: editingTemplate?.temperature || 0.7,
    description: editingTemplate?.description || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editingTemplate
        ? `/admin/model-templates/${editingTemplate.id}`
        : `/admin/model-templates`;
      const method = editingTemplate ? "PUT" : "POST";

      await api[method === "PUT" ? "put" : "post"](url, form);
      toast.success(editingTemplate ? "更新成功" : "创建成功");
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
          <DialogTitle>{editingTemplate ? "编辑模型模板" : "新建模型模板"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "提交中..." : editingTemplate ? "更新" : "创建"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}