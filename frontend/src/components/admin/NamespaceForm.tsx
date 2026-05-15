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

interface Namespace {
  id: number;
  code: string;
  name: string;
  description: string;
  status: number;
}

interface NamespaceFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingNamespace?: Namespace | null;
}

export function NamespaceForm({ open, onClose, onSuccess, editingNamespace }: NamespaceFormProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    code: editingNamespace?.code || "",
    name: editingNamespace?.name || "",
    description: editingNamespace?.description || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editingNamespace
        ? `/api/admin/namespaces/${editingNamespace.id}`
        : `/api/admin/namespaces`;
      const method = editingNamespace ? "PUT" : "POST";

      await api[method === "PUT" ? "put" : "post"](url, form);
      toast.success(editingNamespace ? "更新成功" : "创建成功");
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
          <DialogTitle>{editingNamespace ? "编辑 Namespace" : "新建 Namespace"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Code</Label>
            <Input
              id="code"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              required
            />
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "提交中..." : editingNamespace ? "更新" : "创建"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}