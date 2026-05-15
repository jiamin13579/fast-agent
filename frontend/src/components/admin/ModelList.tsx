"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModelForm } from "./ModelForm";

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

export function ModelList() {
  const [models, setModels] = useState<Model[]>([]);
  const [namespaces, setNamespaces] = useState<Namespace[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [filterNamespace, setFilterNamespace] = useState<string>("all");

  const fetchModels = async (namespaceId?: string) => {
    try {
      let url = '/api/admin/models';
      if (namespaceId && namespaceId !== "all") {
        url += `?namespace_id=${namespaceId}`;
      }
      const data = await api.get<Model[]>(url);
      setModels(data);
    } catch {
      toast.error("获取模型列表失败");
    } finally {
      setLoading(false);
    }
  };

  const fetchNamespaces = async () => {
    try {
      const data = await api.get<Namespace[]>('/api/admin/namespaces');
      setNamespaces(data);
    } catch {
      toast.error("获取 Namespace 列表失败");
    }
  };

  useEffect(() => {
    Promise.all([fetchModels(), fetchNamespaces()]);
  }, []);

  const handleFilterChange = (value: string | null) => {
    if (!value) return;
    setFilterNamespace(value);
    fetchModels(value);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定要删除吗？")) return;
    try {
      await api.delete(`/admin/models/${id}`);
      toast.success("删除成功");
      fetchModels(filterNamespace === "all" ? undefined : filterNamespace);
    } catch {
      toast.error("删除失败");
    }
  };

  const handleEdit = (model: Model) => {
    setEditingModel(model);
    setFormOpen(true);
  };

  const handleClose = () => {
    setFormOpen(false);
    setEditingModel(null);
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
          <Select value={filterNamespace} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="筛选 Namespace" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="0">全局</SelectItem>
              {namespaces.map((ns) => (
                <SelectItem key={ns.id} value={String(ns.id)}>
                  {ns.name} ({ns.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => {
              setEditingModel(null);
              setFormOpen(true);
            }}
          >
            新建
          </Button>
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
                <TableCell>{getNamespaceName(model.namespace_id)}</TableCell>
                <TableCell>{model.name}</TableCell>
                <TableCell>{model.provider}</TableCell>
                <TableCell>{model.model_name}</TableCell>
                <TableCell>
                  <Badge variant={model.status === 1 ? "default" : "secondary"}>
                    {model.status === 1 ? "active" : "inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(model)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(model.id)}>
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ModelForm
        open={formOpen}
        onClose={handleClose}
        onSuccess={() => fetchModels(filterNamespace === "all" ? undefined : filterNamespace)}
        editingModel={editingModel}
        namespaces={namespaces}
      />
    </div>
  );
}