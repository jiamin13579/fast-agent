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
import { NamespaceForm } from "./NamespaceForm";

interface Namespace {
  id: number;
  code: string;
  name: string;
  description: string;
  status: number;
}

export function NamespaceList() {
  const [namespaces, setNamespaces] = useState<Namespace[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingNamespace, setEditingNamespace] = useState<Namespace | null>(null);

  const fetchNamespaces = async () => {
    try {
      const data = await api.get<Namespace[]>('/api/admin/namespaces');
      setNamespaces(data);
    } catch {
      toast.error("获取 Namespace 列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNamespaces();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("确定要删除吗？")) return;
    try {
      await api.delete(`/admin/namespaces/${id}`);
      toast.success("删除成功");
      fetchNamespaces();
    } catch {
      toast.error("删除失败");
    }
  };

  const handleEdit = (ns: Namespace) => {
    setEditingNamespace(ns);
    setFormOpen(true);
  };

  const handleClose = () => {
    setFormOpen(false);
    setEditingNamespace(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Namespace 管理</h1>
        <Button
          onClick={() => {
            setEditingNamespace(null);
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
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {namespaces.map((ns) => (
              <TableRow key={ns.id}>
                <TableCell>{ns.id}</TableCell>
                <TableCell>{ns.code}</TableCell>
                <TableCell>{ns.name}</TableCell>
                <TableCell>{ns.description}</TableCell>
                <TableCell>
                  <Badge variant={ns.status === 1 ? "default" : "secondary"}>
                    {ns.status === 1 ? "active" : "inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(ns)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(ns.id)}>
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <NamespaceForm
        open={formOpen}
        onClose={handleClose}
        onSuccess={fetchNamespaces}
        editingNamespace={editingNamespace}
      />
    </div>
  );
}