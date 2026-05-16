"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/use-auth";
import * as modelsApi from "@/lib/api/admin-models";
import * as namespacesApi from "@/lib/api/admin-namespaces";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModelForm } from "./ModelForm";
import type { LlmModel as Model, Namespace } from "@/types/admin";

export function ModelList() {
  const { isGlobalAdmin } = useAuth();
  const [models, setModels] = useState<Model[]>([]);
  const [namespaces, setNamespaces] = useState<Namespace[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [filterNamespace, setFilterNamespace] = useState<string>("all");

  const fetchModels = async (nsFilter?: string) => {
    try {
      const nsId = nsFilter && nsFilter !== "all" ? Number(nsFilter) : undefined;
      const data = await modelsApi.listModels(nsId);
      setModels(data);
    } catch (e: any) {
      toast.error(e.message || "获取模型列表失败");
    } finally {
      setLoading(false);
    }
  };

  const fetchNamespaces = async () => {
    if (!isGlobalAdmin) return;
    try {
      const data = await namespacesApi.listNamespaces();
      setNamespaces(data);
    } catch {
      toast.error("获取 Namespace 列表失败");
    }
  };

  useEffect(() => {
    fetchModels();
    fetchNamespaces();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("确定要删除吗？")) return;
    try {
      await modelsApi.deleteModel(id);
      toast.success("删除成功");
      fetchModels(filterNamespace);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const getNamespaceName = (nsId: number) => {
    if (nsId === 0) return "全局";
    const ns = namespaces.find((n) => n.id === nsId);
    return ns ? `${ns.name} (${ns.code})` : String(nsId);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">模型管理</h1>
        <div className="flex gap-4">
          {isGlobalAdmin && (
            <Select value={filterNamespace} onValueChange={(v) => { if (!v) return; setFilterNamespace(v); fetchModels(v); }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="筛选 Namespace" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="0">全局</SelectItem>
                {namespaces.map((ns) => (
                  <SelectItem key={ns.id} value={String(ns.id)}>{ns.name} ({ns.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={() => { setEditingModel(null); setFormOpen(true); }}>新建</Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">加载中...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Namespace</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Model Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {models.map((model) => (
              <TableRow key={model.id}>
                <TableCell>{model.id}</TableCell>
                <TableCell>{getNamespaceName(model.namespaceId)}</TableCell>
                <TableCell>{model.name}</TableCell>
                <TableCell>{model.provider}</TableCell>
                <TableCell>{model.modelName}</TableCell>
                <TableCell>
                  <Badge variant={model.status === 1 ? "default" : "secondary"}>
                    {model.status === 1 ? "active" : "inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setEditingModel(model); setFormOpen(true); }}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(model.id)}>Delete</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ModelForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingModel(null); }}
        onSuccess={() => fetchModels(filterNamespace)}
        editingModel={editingModel}
        namespaces={namespaces}
      />
    </div>
  );
}
