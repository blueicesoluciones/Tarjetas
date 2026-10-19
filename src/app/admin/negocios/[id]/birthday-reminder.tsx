"use client";

import { useActionState } from "react";
import { FormStatus } from "@/components/admin/form-status";
import { Button } from "@/components/ui/button";
import { sendBirthdayReminderAction, type BirthdayReminderState } from "../birthday-actions";

export function BirthdayReminderForm({ businessId, pending: pendingCards }: { businessId: string; pending: number }) {
  const [state, action, sending] = useActionState<BirthdayReminderState, FormData>(
    sendBirthdayReminderAction.bind(null, businessId),
    {},
  );
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`¿Enviar el aviso «Actualiza tu información» a ${pendingCards} ${pendingCards === 1 ? "tarjeta" : "tarjetas"} en Wallet?`)) {
          e.preventDefault();
        }
      }}
      className="space-y-2"
    >
      <Button type="submit" variant="outline" disabled={sending || pendingCards === 0}>
        {sending ? "Enviando…" : "Enviar aviso por Wallet"}
      </Button>
      <FormStatus error={state.error} success={state.success} />
    </form>
  );
}
