"use client";

import { useActionState } from "react";
import { FormStatus } from "@/components/admin/form-status";
import { Button } from "@/components/ui/button";
import { resyncAllWalletCardsAction, type ResyncState } from "./domain-actions";

export function ResyncAllForm() {
  const [state, action, pending] = useActionState<ResyncState, FormData>(
    () => resyncAllWalletCardsAction(),
    {},
  );
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("¿Actualizar todas las tarjetas de Google Wallet y Apple Wallet de todos los negocios?"))
          e.preventDefault();
      }}
      className="space-y-2"
    >
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Actualizando…" : "Actualizar todas las tarjetas"}
      </Button>
      <FormStatus error={state.error} success={state.success} />
    </form>
  );
}
