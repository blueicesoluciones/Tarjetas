"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { FormStatus } from "@/components/admin/form-status";
import { Button } from "@/components/ui/button";
import {
  assignCashierBranch,
  createBranch,
  setBranchActive,
  updateBranch,
  type BranchFormState,
} from "../branch-actions";

export interface BranchItem {
  id: string;
  name: string;
  address: string | null;
  isActive: boolean;
  logoUrl: string | null;
  cashiers: number;
}

const inputClass = "h-9 w-full rounded-lg border bg-background px-2.5 text-sm";

export function CreateBranchForm({ businessId }: { businessId: string }) {
  const [state, action, pending] = useActionState<BranchFormState, FormData>(createBranch.bind(null, businessId), {});
  return (
    <form action={action} className="space-y-2" key={state.success ?? "new-branch"}>
      <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
        <input name="name" required maxLength={60} placeholder="Nombre (ej. Sede Centro)" aria-label="Nombre de la sede" className={inputClass} />
        <input name="address" maxLength={120} placeholder="Dirección (opcional)" aria-label="Dirección" className={inputClass} />
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Creando…" : "Crear sede"}
        </Button>
      </div>
      <FormStatus error={state.error} success={state.success} />
    </form>
  );
}

/**
 * Logo de la sede: se ve dentro de cada sello puesto en ella. El servidor lo
 * recorta en círculo, así que sirve una imagen cuadrada o con fondo.
 */
function BranchLogo({ branch }: { branch: BranchItem }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(init: RequestInit, url = "/admin/negocios/sedes/logo") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, init);
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !body.ok) setError(body.error ?? "No se pudo guardar el logo");
      else router.refresh();
    } catch {
      setError("Sin conexión");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-1">
      <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted">
        {branch.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- vista previa del logo guardado
          <img src={branch.logoUrl} alt={`Logo de ${branch.name}`} className="size-full rounded-full object-cover" />
        ) : (
          <MapPin className="size-4 text-muted-foreground" aria-hidden />
        )}
      </span>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        aria-label={`Logo de ${branch.name}`}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const fd = new FormData();
          fd.set("branchId", branch.id);
          fd.set("file", file);
          void send({ method: "POST", body: fd });
        }}
      />
      <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? "Guardando…" : branch.logoUrl ? "Cambiar logo" : "Subir logo"}
      </Button>
      {branch.logoUrl ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() => {
            if (confirm(`¿Quitar el logo de ${branch.name}? Sus sellos volverán a verse con el chulo.`)) {
              void send({ method: "DELETE" }, `/admin/negocios/sedes/logo?branchId=${branch.id}`);
            }
          }}
        >
          Quitar
        </Button>
      ) : null}
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  );
}

export function BranchRow({ branch }: { branch: BranchItem }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<BranchFormState, FormData>(updateBranch.bind(null, branch.id), {});

  if (editing) {
    return (
      <li className="py-3">
        <form action={action} className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto_auto]">
            <input name="name" required maxLength={60} defaultValue={branch.name} aria-label="Nombre de la sede" className={inputClass} />
            <input name="address" maxLength={120} defaultValue={branch.address ?? ""} placeholder="Dirección (opcional)" aria-label="Dirección" className={inputClass} />
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Guardando…" : "Guardar"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cerrar
            </Button>
          </div>
          <FormStatus error={state.error} success={state.success} />
        </form>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2">
      <div>
        <p className={`font-medium ${branch.isActive ? "" : "text-muted-foreground"}`}>
          {branch.name}
          {branch.isActive ? null : <span className="ml-2 text-xs">(desactivada)</span>}
        </p>
        <p className="text-xs text-muted-foreground">
          {branch.address ? `${branch.address} · ` : ""}
          {branch.cashiers === 1 ? "1 cajero" : `${branch.cashiers} cajeros`}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <BranchLogo branch={branch} />
        <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(true)}>
          Editar
        </Button>
        <form
          action={setBranchActive}
          onSubmit={(e) => {
            if (branch.isActive && !confirm(`¿Desactivar ${branch.name}? Sus cajeros no podrán elegirla y deja de aparecer en el escáner. El historial se conserva.`)) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="branchId" value={branch.id} />
          <input type="hidden" name="active" value={branch.isActive ? "false" : "true"} />
          <Button type="submit" size="sm" variant="ghost">
            {branch.isActive ? "Desactivar" : "Reactivar"}
          </Button>
        </form>
      </div>
    </li>
  );
}

/** Sede de un cajero; se guarda al cambiar (controlado, ver BranchSelect). */
export function CashierBranchSelect({
  userId,
  branchId,
  branches,
}: {
  userId: string;
  branchId: string | null;
  branches: { id: string; name: string; isActive: boolean }[];
}) {
  const [value, setValue] = useState(branchId ?? "");
  const [pending, startTransition] = useTransition();
  return (
    <select
      name="branchId"
      value={value}
      disabled={pending}
      aria-label="Sede del cajero"
      onChange={(e) => {
        const next = e.target.value;
        setValue(next);
        const fd = new FormData();
        fd.set("userId", userId);
        fd.set("branchId", next);
        startTransition(() => assignCashierBranch(fd));
      }}
      className="h-8 rounded-md border bg-background px-2 text-sm"
    >
      <option value="">Sin sede</option>
      {branches
        .filter((b) => b.isActive || b.id === branchId)
        .map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
    </select>
  );
}
