"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface NamespaceUser {
  id: number;
  userId: number;
  namespaceId: number;
  role: "ADMIN" | "USER";
  user?: {
    id: number;
    email: string;
    nickname: string;
  };
}

interface Namespace {
  id: number;
  code: string;
  name: string;
}

export default function NamespaceUsersPage() {
  const params = useParams();
  const namespaceId = Number(params.id);

  const [users, setUsers] = useState<NamespaceUser[]>([]);
  const [namespace, setNamespace] = useState<Namespace | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchNamespace = async () => {
    try {
      const data = await api.get<Namespace>(`/admin/namespaces/${namespaceId}`);
      setNamespace(data);
    } catch {
      toast.error("获取 Namespace 信息失败");
    }
  };

  const fetchUsers = async () => {
    try {
      // Note: This endpoint does not exist yet in the backend
      // The backend needs to implement GET /admin/namespaces/{id}/users
      const data = await api.get<NamespaceUser[]>(`/admin/namespaces/${namespaceId}/users`);
      setUsers(data);
    } catch (error) {
      // Backend endpoint not implemented yet
      toast.error("获取用户列表失败， backend 接口尚未实现");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([fetchNamespace(), fetchUsers()]);
  }, [namespaceId]);

  const handleRoleChange = async (userId: number, newRole: "ADMIN" | "USER") => {
    try {
      // Note: This endpoint does not exist yet in the backend
      // The backend needs to implement PUT /admin/namespaces/{id}/users/{userId}
      await api.put(`/admin/namespaces/${namespaceId}/users/${userId}`, { role: newRole });
      toast.success("更新成功");
      fetchUsers();
    } catch (error) {
      toast.error("更新失败， backend 接口尚未实现");
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
            {users.map((user) => (
              <div
                key={user.id}
                className="p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 font-medium">
                      {user.user?.nickname?.[0] || user.user?.email?.[0] || "?"}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium">
                      {user.user?.nickname || "Unknown"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {user.user?.email || `User ID: ${user.userId}`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <select
                    value={user.role}
                    onChange={(e) =>
                      handleRoleChange(
                        user.userId,
                        e.target.value as "ADMIN" | "USER"
                      )
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

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-medium text-yellow-800">Backend API 尚未实现</h3>
        <p className="text-sm text-yellow-700 mt-1">
          以下接口需要在 AdminNamespaceController 中实现：
        </p>
        <ul className="text-sm text-yellow-700 mt-2 list-disc list-inside">
          <li>
            <code>GET /admin/namespaces/{namespaceId}/users</code> - 获取
            Namespace 用户列表
          </li>
          <li>
            <code>PUT /admin/namespaces/{"{"}namespaceId{"}"}/users/{"{"}userId{"}"}</code>
            - 更新用户角色
          </li>
        </ul>
      </div>
    </div>
  );
}