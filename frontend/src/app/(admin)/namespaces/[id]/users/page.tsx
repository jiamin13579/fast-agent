"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import * as namespacesApi from "@/lib/api/admin-namespaces";
import type { Namespace } from "@/types/admin";

export default function NamespaceUsersPage() {
  const params = useParams();
  const namespaceId = Number(params.id);

  const [users, setUsers] = useState<{ userId: number; role: string; nickname: string; email: string }[]>([]);
  const [namespace, setNamespace] = useState<Namespace | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchNamespace = async () => {
    try {
      const data = await namespacesApi.getNamespace(namespaceId);
      setNamespace(data);
    } catch {
      toast.error("获取 Namespace 信息失败");
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await namespacesApi.listNamespaceUsers(namespaceId);
      setUsers(data);
    } catch {
      toast.error("获取用户列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([fetchNamespace(), fetchUsers()]);
  }, [namespaceId]);

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      await namespacesApi.updateUserRole(namespaceId, userId, newRole);
      toast.success("更新成功");
      fetchUsers();
    } catch {
      toast.error("更新失败");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-semibold">Namespace 用户管理</h1>
        {namespace && (
          <span className="text-muted-foreground">
            {namespace.name} ({namespace.code})
          </span>
        )}
      </div>

      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h2 className="font-medium">用户列表</h2>
          <p className="text-sm text-muted-foreground mt-1">
            管理 Namespace 内的用户及其角色
          </p>
        </div>

        {users.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            暂无用户
          </div>
        ) : (
          <div className="divide-y">
            {users.map((user, index) => (
              <div
                key={user.userId || index}
                className="p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 font-medium">
                      {user.nickname?.[0] || user.email?.[0] || "?"}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium">
                      {user.nickname || "Unknown"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {user.email || `User ID: ${user.userId}`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <select
                    value={user.role}
                    onChange={(e) =>
                      handleRoleChange(user.userId, e.target.value)
                    }
                    className="px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="USER">User</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
