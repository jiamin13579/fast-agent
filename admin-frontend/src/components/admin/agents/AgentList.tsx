"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/use-auth";
import * as agentsApi from "@/lib/api/admin-agents";
import * as namespacesApi from "@/lib/api/admin-namespaces";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AgentForm } from "./AgentForm";
import { ResourceBindingDialog } from "./ResourceBindingDialog";
import type { Agent, Namespace } from "@/types/admin";

export function AgentList() {
  const { isGlobalAdmin } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [namespaces, setNamespaces] = useState<Namespace[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [bindingAgent, setBindingAgent] = useState<Agent | null>(null);
  const [filterNamespace, setFilterNamespace] = useState<string>("all");

  const fetchAgents = async (nsFilter?: string) => {
    try {
      const nsId = nsFilter && nsFilter !== "all" ? Number(nsFilter) : undefined;
      const data = await agentsApi.listAgents(nsId);
      setAgents(data);
    } catch (e: any) {
      toast.error(e.message || "获取 Agent 列表失败");
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
    fetchAgents();
    fetchNamespaces();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("确定要删除吗？")) return;
    try {
      await agentsApi.deleteAgent(id);
      toast.success("删除成功");
      fetchAgents(filterNamespace);
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
        <h1 className="text-xl font-semibold">Agent 管理</h1>
        <div className="flex gap-4">
          {isGlobalAdmin && (
            <Select value={filterNamespace} onValueChange={(v) => { if (!v) return; setFilterNamespace(v); fetchAgents(v); }}>
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
          <Button onClick={() => { setEditingAgent(null); setFormOpen(true); }}>新建</Button>
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
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.map((agent) => (
              <TableRow key={agent.id}>
                <TableCell>{agent.id}</TableCell>
                <TableCell>{getNamespaceName(agent.namespaceId)}</TableCell>
                <TableCell>{agent.name}</TableCell>
                <TableCell>{agent.description}</TableCell>
                <TableCell>
                  <Badge variant={agent.status === 1 ? "default" : "secondary"}>
                    {agent.status === 1 ? "active" : "inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setEditingAgent(agent); setFormOpen(true); }}>Edit</Button>
                    <Button size="sm" variant="outline" onClick={() => setBindingAgent(agent)}>绑定资源</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(agent.id)}>Delete</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <AgentForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingAgent(null); }}
        onSuccess={() => fetchAgents(filterNamespace)}
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
