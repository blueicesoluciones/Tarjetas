"use client";

import { useActionState } from "react";
import { BusinessFields, type BusinessDefaults } from "@/components/admin/business-fields";
import { Field } from "@/components/admin/fields";
import { FormStatus } from "@/components/admin/form-status";
import { ProgramFields, type ProgramDefaults } from "@/components/admin/program-fields";
import { Button } from "@/components/ui/button";
import { changeUserPassword, createBusinessUser, updateBusiness, updateProgram, type AdminFormState } from "../actions";

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

export function CreateUserForm({ businessId }: { businessId: string }) {
  const [state, action, pending] = useActionState<AdminFormState, FormData>(createBusinessUser.bind(null, businessId), {});
  return (
    <form action={action} className="space-y-4" key={state.success ?? "form"}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre completo" name="full_name" required maxLength={80} />
        <Field label="Email (usuario para ingresar)" name="email" type="email" required autoComplete="off" />
        <Field label="Contraseña" name="password" type="text" required minLength={8} autoComplete="new-password" />
        <label className="space-y-2 text-sm">
          <span className="font-medium">Rol</span>
          <select name="role" defaultValue="cashier" className="block h-9 w-full rounded-lg border bg-background px-2">
            <option value="cashier">Cajero</option>
            <option value="owner">Dueño</option>
          </select>
        </label>
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
