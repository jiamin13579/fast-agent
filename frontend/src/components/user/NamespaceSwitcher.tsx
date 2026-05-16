"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface NamespaceItem {
  id: number;
  name: string;
  role: string;
}

export function NamespaceSwitcher({
  namespaces,
  current,
  onChange,
}: {
  namespaces: NamespaceItem[];
  current: number;
  onChange: (id: number) => void;
}) {
  if (namespaces.length === 0) return null;

  return (
    <Select value={String(current)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger className="w-[180px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {namespaces.map((ns) => (
          <SelectItem key={ns.id} value={String(ns.id)}>
            {ns.name || `空间 ${ns.id}`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
