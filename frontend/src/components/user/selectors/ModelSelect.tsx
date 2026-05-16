"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ModelItem {
  id: number;
  name: string;
}

export function ModelSelect({
  models,
  value,
  onChange,
  placeholder = "选择模型",
}: {
  models: ModelItem[];
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
        {models.map((m) => (
          <SelectItem key={m.id} value={String(m.id)}>
            {m.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
