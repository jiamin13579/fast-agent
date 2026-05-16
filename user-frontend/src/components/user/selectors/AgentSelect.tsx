"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AgentItem {
  id: number;
  name: string;
}

export function AgentSelect({
  agents,
  value,
  onChange,
  placeholder = "选择 Agent",
}: {
  agents: AgentItem[];
  value: number | null;
  onChange: (id: number) => void;
  placeholder?: string;
}) {
  return (
    <Select value={value ? String(value) : ""} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {agents.map((a) => (
          <SelectItem key={a.id} value={String(a.id)}>
            {a.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
