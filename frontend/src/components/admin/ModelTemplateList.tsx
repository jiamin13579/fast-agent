"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { ModelTemplateForm } from "./ModelTemplateForm";

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

export function ModelTemplateList() {
  const [templates, setTemplates] = useState<ModelTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ModelTemplate | null>(null);

  const fetchTemplates = async () => {
    try {
      const data = await api.get<ModelTemplate[]>('/api/admin/model-templates');
      setTemplates(data);
    } catch {
      toast.error("获取模型模板列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("确定要删除吗？")) return;
    try {
      await api.delete(`/api/admin/model-templates/${id}`);
      toast.success("删除成功");
      fetchTemplates();
    } catch {
      toast.error("删除失败");
    }
  };

  const handleEdit = (template: ModelTemplate) => {
    setEditingTemplate(template);
    setFormOpen(true);
  };

  const handleClose = () => {
    setFormOpen(false);
    setEditingTemplate(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">模型模板管理</h1>
        <Button
          onClick={() => {
            setEditingTemplate(null);
            setFormOpen(true);
          }}
        >
          新建
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">加载中...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Model Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((template) => (
              <TableRow key={template.id}>
                <TableCell>{template.id}</TableCell>
                <TableCell>{template.name}</TableCell>
                <TableCell>{template.provider}</TableCell>
                <TableCell>{template.model_name}</TableCell>
                <TableCell>{template.description}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(template)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(template.id)}>
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ModelTemplateForm
        open={formOpen}
        onClose={handleClose}
        onSuccess={fetchTemplates}
        editingTemplate={editingTemplate}
      />
    </div>
  );
}