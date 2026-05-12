# 右上角用户信息展示 - 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在应用右上角展示用户头像和昵称，点击展开下拉菜单显示详细信息和登出选项

**Architecture:** 修改现有的 `AppLayout` 组件，在顶部 header 区域右侧添加用户信息组件。使用 React state 控制下拉菜单的展开收起，通过 useEffect 监听点击外部事件关闭菜单。

**Tech Stack:** Next.js (App Router), React, Tailwind CSS

---

## 文件修改

- Modify: `frontend/src/components/layout.tsx`

---

## 实现步骤

### Task 1: 添加 HeaderRight 组件和下拉菜单

- [ ] **Step 1: 修改 layout.tsx 添加 HeaderRight 组件**

文件: `frontend/src/components/layout.tsx`

在 `Sidebar` 组件后、`AppLayout` 函数前添加以下代码:

```tsx
function getInitials(name: string): string {
  return name ? name.charAt(0).toUpperCase() : "?";
}

export function HeaderRight() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<{ nickname: string; email: string; role: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      fetch(`${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080/api"}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          setUser(data);
          setIsLoading(false);
        })
        .catch(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    router.push("/login");
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4">
        <div className="w-8 h-8 rounded-full bg-blue-100 animate-pulse" />
        <div className="w-16 h-4 bg-blue-100 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-medium">
          {getInitials(user?.nickname || "")}
        </div>
        <span className="text-sm text-blue-700">{user?.nickname || "用户"}</span>
        <span className="text-blue-400 text-xs">{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border border-blue-100 py-2 z-50">
          <div className="px-4 py-2 border-b border-blue-50">
            <div className="font-medium text-blue-800">{user?.nickname}</div>
            <div className="text-xs text-blue-400">{user?.email}</div>
            <div className="mt-1">
              <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-600">
                {user?.role || "USER"}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <span>🚪</span> 退出登录
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 修改 AppLayout 添加 HeaderRight**

在 `AppLayout` 函数内的 `<div className="flex h-screen">` 后面，在 `<main>` 前添加 header:

```tsx
<div className="flex h-screen">
  {!hideSidebar && <Sidebar />}
  <div className="flex-1 flex flex-col">
    <header className="h-14 bg-white border-b border-blue-100 flex items-center justify-end px-4">
      <HeaderRight />
    </header>
    <main className="flex-1 h-screen overflow-hidden">{children}</main>
  </div>
</div>
```

- [ ] **Step 3: 添加 useRouter import**

文件顶部已有 `usePathname` from `next/navigation`，添加:

```tsx
import { usePathname, useRouter } from "next/navigation";
```

- [ ] **Step 4: 添加 useRef import**

文件顶部已有 `createContext, useContext, useState` from `react`，添加:

```tsx
import { createContext, useContext, useState, useEffect, useRef } from "react";
```

- [ ] **Step 5: 提交代码**

```bash
git add frontend/src/components/layout.tsx
git commit -m "feat: add user avatar and dropdown menu in header"
```

---

## 验证

1. 打开 http://localhost:3000
2. 登录后应该在右上角看到头像和昵称
3. 点击头像应该展开下拉菜单
4. 点击"退出登录"应该清除登录状态并跳转到登录页