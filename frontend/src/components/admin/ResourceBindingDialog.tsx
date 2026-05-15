"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface Agent {
  id: number;
  namespace_id: number;
  name: string;
}

interface Model {
  id: number;
  namespace_id: number;
  name: string;
  provider: string;
  model_name: string;
}

interface BoundResource {
  id: number;
  resource_type: string;
  resource_id: number;
  resource_name?: string;
}

interface ResourceBindingDialogProps {
  agent: Agent;
  open: boolean;
  onClose: () => void;
}

export function ResourceBindingDialog({ agent, open, onClose }: ResourceBindingDialogProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [boundResources, setBoundResources] = useState<BoundResource[]>([]);
  const [loading, setLoading] = useState(false);
  const [binding, setBinding] = useState(false);

  const fetchModels = async () => {
    try {
      const nsId = agent.namespace_id || 0;
      const data = await api.get<Model[]>(`/api/admin/models?namespace_id=${nsId}`);
      setModels(data);
    } catch {
      toast.error("获取模型列表失败");
    }
  };

  const fetchBoundResources = async () => {
    try {
      const data = await api.get<BoundResource[]>(`/api/admin/agents/${agent.id}/resources`);
      setBoundResources(data);
    } catch {
      toast.error("获取绑定资源失败");
    }
  };

  useEffect(() => {
    if (open) {
      setLoading(true);
      Promise.all([fetchModels(), fetchBoundResources()]).finally(() => setLoading(false));
    }
  }, [open, agent.id]);

  const handleBind = async (resourceType: string, resourceId: number) => {
    setBinding(true);
    try {
      await api.post(`/api/admin/agents/${agent.id}/resources`, { resource_type: resourceType, resource_id: resourceId });
      toast.success("绑定成功");
      fetchBoundResources();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBinding(false);
    }
  };

  const handleUnbind = async (resourceId: number, resourceType: string) => {
    try {
      await api.delete(`/api/admin/agents/${agent.id}/resources/${resourceId}?type=${resourceType}`);
      toast.success("解绑成功");
      fetchBoundResources();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const isBound = (resourceId: number) => {
    return boundResources.some((r) => r.resource_id === resourceId);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>绑定资源 - {agent.name}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">加载中...</div>
        ) : (
          <Tabs defaultValue="MODEL">
            <TabsList>
              <TabsTrigger value="MODEL">模型</TabsTrigger>
              <TabsTrigger value="TOOL">工具</TabsTrigger>
            </TabsList>

            <TabsContent value="MODEL" className="space-y-4">
              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-medium mb-2">已绑定模型</h3>
                {boundResources.filter((r) => r.resource_type === "MODEL").length === 0 ? (
                  <p className="text-sm text-muted-foreground">暂无绑定</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {boundResources
                      .filter((r) => r.resource_type === "MODEL")
                      .map((r) => {
                        const model = models.find((m) => m.id === r.resource_id);
                        return (
                          <Badge key={r.id} variant="default" className="gap-2">
                            {model ? `${model.name} (${model.model_name})` : `ID: ${r.resource_id}`}
                            <button
                              onClick={() => handleUnbind(r.resource_id, "MODEL")}
                              className="hover:text-destructive"
                            >
                              ×
                            </button>
                          </Badge>
                        );
                      })}
                  </div>
                )}
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-medium mb-2">可选模型</h3>
                {models.length === 0 ? (
                  <p className="text-sm text-muted-foreground">暂无可用模型</p>
                ) : (
                  <div className="space-y-2">
                    {models.map((model) => (
                      <div key={model.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <p className="text-sm font-medium">{model.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {model.provider} - {model.model_name}
                          </p>
                        </div>
                        {isBound(model.id) ? (
                          <Badge variant="secondary">已绑定</Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleBind("MODEL", model.id)}
                            disabled={binding}
                          >
                            绑定
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="TOOL" className="space-y-4">
              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-medium mb-2">已绑定工具</h3>
                {boundResources.filter((r) => r.resource_type === "TOOL").length === 0 ? (
                  <p className="text-sm text-muted-foreground">暂无绑定</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {boundResources
                      .filter((r) => r.resource_type === "TOOL")
                      .map((r) => (
                        <Badge key={r.id} variant="default" className="gap-2">
                          {r.resource_name || `ID: ${r.resource_id}`}
                          <button
                            onClick={() => handleUnbind(r.resource_id, "TOOL")}
                            className="hover:text-destructive"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground text-center py-4">暂无可用工具</p>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}