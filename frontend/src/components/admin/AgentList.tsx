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
import { AgentForm } from "./AgentForm";
import { ResourceBindingDialog } from "./ResourceBindingDialog";

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

export function AgentList() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [namespaces, setNamespaces] = useState<Namespace[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [bindingAgent, setBindingAgent] = useState<Agent | null>(null);

  const fetchAgents = async () => {
    try {
      const data = await api.get<Agent[]>('/api/admin/agents');
      setAgents(data);
    } catch {
      toast.error("获取 Agent 列表失败");
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
    Promise.all([fetchAgents(), fetchNamespaces()]);
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("确定要删除吗？")) return;
    try {
      await api.delete(`/admin/agents/${id}`);
      toast.success("删除成功");
      fetchAgents();
    } catch {
      toast.error("删除失败");
    }
  };

  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setFormOpen(true);
  };

  const handleClose = () => {
    setFormOpen(false);
    setEditingAgent(null);
  };

  const getNamespaceName = (nsId: number) => {
    if (nsId === 0) return "全局";
    const ns = namespaces.find((n) => n.id === nsId);
    return ns ? `${ns.name} (${ns.code})` : String(nsId);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Agent 管理</h1>
        <Button
          onClick={() => {
            setEditingAgent(null);
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
              <TableHead>Namespace</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.map((agent) => (
              <TableRow key={agent.id}>
                <TableCell>{agent.id}</TableCell>
                <TableCell>{getNamespaceName(agent.namespace_id)}</TableCell>
                <TableCell>{agent.name}</TableCell>
                <TableCell>{agent.description}</TableCell>
                <TableCell>
                  <Badge variant={agent.status === 1 ? "default" : "secondary"}>
                    {agent.status === 1 ? "active" : "inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(agent)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setBindingAgent(agent)}>
                      绑定资源
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(agent.id)}>
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <AgentForm
        open={formOpen}
        onClose={handleClose}
        onSuccess={fetchAgents}
        editingAgent={editingAgent}
        namespaces={namespaces}
      />

      {bindingAgent && (
        <ResourceBindingDialog
          agent={bindingAgent}
          open={!!bindingAgent}
          onClose={() => setBindingAgent(null)}
        />
      )}
    </div>
  );
}