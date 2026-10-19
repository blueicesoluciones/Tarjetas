"use client";

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

/** Selector de sede que se guarda al cambiar (sin botón). */
export function BranchSelect({ action, branches, selectedId, allLabel, label, selectClassName }: Props) {
  return (
    <form action={action} className="flex items-center gap-2 text-sm">
      <MapPin className="size-4 opacity-60" aria-hidden />
      <label htmlFor="branch-select" className="sr-only">
        {label}
      </label>
      <select
        id="branch-select"
        name="branchId"
        defaultValue={selectedId ?? ""}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
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
    </form>
  );
}
