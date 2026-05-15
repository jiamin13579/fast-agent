"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Namespace {
  id: number;
  name?: string;
  role: string;
}

export function NamespaceSwitcher({
  namespaces,
  current,
  onChange,
}: {
  namespaces: Namespace[];
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
        {namespaces.map((ns) => {
          const name = ns.name || `空间 ${ns.id}`;
          return (
            <SelectItem key={ns.id} value={String(ns.id)}>
              {name}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
