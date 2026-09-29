"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ColorField({ label, name, defaultValue }: { label: string; name: string; defaultValue: string }) {
  const [value, setValue] = useState(defaultValue);
  const valid = /^#[0-9A-Fa-f]{6}$/.test(value);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} (selector)`}
          value={valid ? value : "#000000"}
          onChange={(e) => setValue(e.target.value.toUpperCase())}
          className="h-8 w-10 shrink-0 cursor-pointer rounded border bg-transparent"
        />
        <Input
          id={name}
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          pattern="^#[0-9A-Fa-f]{6}$"
          required
          aria-invalid={!valid}
        />
      </div>
    </div>
  );
}
