"use client";

import { useActionState, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { BusinessFields, type BusinessDefaults } from "@/components/admin/business-fields";
import { Field } from "@/components/admin/fields";
import { FormStatus } from "@/components/admin/form-status";
import { ProgramFields, type ProgramDefaults } from "@/components/admin/program-fields";
import { Button } from "@/components/ui/button";
import {
  changeUserPassword,
  createBusinessUser,
  deleteBusiness,
  updateBusiness,
  updateProgram,
  type AdminFormState,
} from "../actions";

export function BusinessEditForm({ businessId, defaults }: { businessId: string; defaults: BusinessDefaults }) {
  const [state, action, pending] = useActionState<AdminFormState, FormData>(updateBusiness.bind(null, businessId), {});
  return (
    <form
      action={action}
      className="space-y-4"
      onSubmit={(e) => {
        const status = new FormData(e.currentTarget).get("status");
        if (status === "suspended" && defaults.status !== "suspended") {
          if (!confirm("¿Suspender este negocio? Sus tarjetas dejarán de aceptar sellos.")) e.preventDefault();
        }
      }}
    >
      <BusinessFields defaults={defaults} isNew={false} />
      <FormStatus error={state.error} success={state.success} />
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar negocio"}
      </Button>
    </form>
  );
}

export function ProgramEditForm({ programId, defaults }: { programId: string; defaults: ProgramDefaults }) {
  const [state, action, pending] = useActionState<AdminFormState, FormData>(updateProgram.bind(null, programId), {});
  return (
    <form action={action} className="space-y-4">
      <ProgramFields defaults={defaults} />
      <FormStatus error={state.error} success={state.success} />
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar programa"}
      </Button>
    </form>
  );
}

export function CreateUserForm({
  businessId,
  branches = [],
}: {
  businessId: string;
  /** Sedes activas (multisede): el cajero queda asignado a una. */
  branches?: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<AdminFormState, FormData>(createBusinessUser.bind(null, businessId), {});
  const [role, setRole] = useState("cashier");
  return (
    <form action={action} className="space-y-4" key={state.success ?? "form"}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre completo" name="full_name" required maxLength={80} />
        <Field label="Email (usuario para ingresar)" name="email" type="email" required autoComplete="off" />
        <Field label="Contraseña" name="password" type="text" required minLength={8} autoComplete="new-password" />
        <label className="space-y-2 text-sm">
          <span className="font-medium">Rol</span>
          <select
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="block h-9 w-full rounded-lg border bg-background px-2"
          >
            <option value="cashier">Cajero</option>
            <option value="owner">Dueño</option>
          </select>
        </label>
        {branches.length > 0 && role === "cashier" ? (
          <label className="space-y-2 text-sm">
            <span className="font-medium">Sede</span>
            <select name="branchId" defaultValue="" className="block h-9 w-full rounded-lg border bg-background px-2">
              <option value="">Sin sede</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      <FormStatus error={state.error} success={state.success} />
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Creando…" : "Crear usuario"}
      </Button>
    </form>
  );
}

export function ChangePasswordForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState<AdminFormState, FormData>(changeUserPassword, {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-2" key={state.success ?? "pw"}>
      <input type="hidden" name="userId" value={userId} />
      <input
        name="password"
        type="text"
        required
        minLength={8}
        placeholder="Nueva contraseña"
        autoComplete="new-password"
        aria-label="Nueva contraseña"
        className="h-8 w-44 rounded-md border bg-background px-2 text-sm"
      />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "…" : "Cambiar"}
      </Button>
      {state.error ? <span className="text-xs text-destructive">{state.error}</span> : null}
      {state.success ? <span className="text-xs text-emerald-700">{state.success}</span> : null}
    </form>
  );
}

export function DeleteBusinessForm({
  businessId,
  name,
  slug,
  counts,
}: {
  businessId: string;
  name: string;
  slug: string;
  counts: { customers: number; cards: number; staff: number };
}) {
  const [state, action, pending] = useActionState<AdminFormState, FormData>(deleteBusiness.bind(null, businessId), {});
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [understand, setUnderstand] = useState(false);
  const ready = typed.trim() === slug && understand;

  if (!open) {
    return (
      <Button type="button" variant="destructive" onClick={() => setOpen(true)}>
        Eliminar negocio…
      </Button>
    );
  }

  return (
    <form action={action} className="space-y-4 rounded-xl border-2 border-destructive/60 bg-destructive/5 p-4">
      <div className="flex gap-3">
        <TriangleAlert className="size-6 shrink-0 text-destructive" />
        <div className="space-y-2 text-sm">
          <p className="text-base font-semibold">¿Eliminar «{name}» para siempre?</p>
          <p>Esto no se puede deshacer. Se borra todo lo del negocio:</p>
          <ul className="list-disc space-y-0.5 pl-5">
            <li>
              <strong>{counts.customers}</strong> clientes y <strong>{counts.cards}</strong> tarjetas, con todos sus sellos y premios
            </li>
            <li>
              <strong>{counts.staff}</strong> usuarios (dueño y cajeros): ya no podrán ingresar
            </li>
            <li>El programa, el logo, el fondo, las campañas y su enlace /n/{slug}</li>
            <li>Las tarjetas en Google Wallet de sus clientes quedan como vencidas</li>
          </ul>
          <p className="text-muted-foreground">
            Si solo quieres pausarlo, mejor cambia el <strong>Estado</strong> a «Suspendido» en Datos del negocio.
          </p>
        </div>
      </div>
      <label className="block space-y-1.5 text-sm">
        <span>
          Para confirmar, escribe <code className="rounded bg-muted px-1.5 py-0.5 font-mono font-semibold">{slug}</code>
        </span>
        <input
          name="confirmSlug"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          className="h-9 w-full max-w-sm rounded-lg border border-input bg-background px-2.5 font-mono text-sm"
        />
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="understand"
          checked={understand}
          onChange={(e) => setUnderstand(e.target.checked)}
          className="mt-0.5 size-4"
        />
        Entiendo que se borrarán los datos de {counts.customers} clientes y que no se pueden recuperar.
      </label>
      <FormStatus error={state.error} />
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          variant="destructive"
          disabled={!ready || pending}
          className="bg-destructive text-white hover:bg-destructive/90"
        >
          {pending ? "Eliminando…" : "Eliminar definitivamente"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setOpen(false);
            setTyped("");
            setUnderstand(false);
          }}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
