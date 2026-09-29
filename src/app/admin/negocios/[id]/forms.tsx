"use client";

import { useActionState } from "react";
import { BusinessFields, type BusinessDefaults } from "@/components/admin/business-fields";
import { Field } from "@/components/admin/fields";
import { FormStatus } from "@/components/admin/form-status";
import { ProgramFields, type ProgramDefaults } from "@/components/admin/program-fields";
import { Button } from "@/components/ui/button";
import { inviteOwner, updateBusiness, updateProgram, type AdminFormState } from "../actions";

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

export function InviteOwnerForm({ businessId }: { businessId: string }) {
  const [state, action, pending] = useActionState<AdminFormState, FormData>(inviteOwner.bind(null, businessId), {});
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre completo" name="owner_name" required maxLength={80} />
        <Field label="Email" name="owner_email" type="email" required autoComplete="off" />
      </div>
      <FormStatus error={state.error} success={state.success} manualLink={state.manualLink} />
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Invitando…" : "Enviar invitación"}
      </Button>
    </form>
  );
}
