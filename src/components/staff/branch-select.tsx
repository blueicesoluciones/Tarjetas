"use client";

import { useState, useTransition } from "react";
import { MapPin } from "lucide-react";

interface Props {
  action: (formData: FormData) => Promise<void>;
  branches: { id: string; name: string; isActive: boolean }[];
  selectedId: string | null;
  /** Texto de la opción sin sede (ej. «Todas las sedes»). */
  allLabel: string;
  label: string;
  /** Estilo del select (el escáner usa fondo oscuro). */
  selectClassName?: string;
}

/**
 * Selector de sede que se guarda al cambiar (sin botón). Es controlado y llama la
 * acción directamente: un <form action> se reinicia al terminar y el select
 * volvía a mostrar la primera opción aunque la sede sí cambiaba.
 */
export function BranchSelect({ action, branches, selectedId, allLabel, label, selectClassName }: Props) {
  const [value, setValue] = useState(selectedId ?? "");
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2 text-sm">
      <MapPin className="size-4 opacity-60" aria-hidden />
      <label htmlFor="branch-select" className="sr-only">
        {label}
      </label>
      <select
        id="branch-select"
        name="branchId"
        value={value}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          setValue(next);
          const fd = new FormData();
          fd.set("branchId", next);
          startTransition(() => action(fd));
        }}
        className={selectClassName ?? "h-8 max-w-52 rounded-lg border border-input bg-background px-2 text-sm"}
      >
        <option value="">{allLabel}</option>
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
            {b.isActive ? "" : " (inactiva)"}
          </option>
        ))}
      </select>
    </div>
  );
}
