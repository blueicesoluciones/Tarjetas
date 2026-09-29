"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteCustomerAction, type DeleteState } from "./actions";

export function DeleteCustomer({ customerId, customerName }: { customerId: string; customerName: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<DeleteState, FormData>(deleteCustomerAction, {});

  return (
    <section className="mt-8 rounded-xl border border-destructive/30 p-4">
      <p className="font-medium text-destructive">Eliminar cliente</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Borra sus datos personales a pedido del cliente. El historial se conserva de forma anónima para estadísticas y la
        tarjeta queda bloqueada. No se puede deshacer.
      </p>
      {open ? (
        <form action={action} className="mt-3 space-y-2">
          <input type="hidden" name="customerId" value={customerId} />
          <label className="block text-sm" htmlFor="confirmName">
            Escribe <strong>{customerName}</strong> para confirmar
          </label>
          <Input id="confirmName" name="confirmName" autoComplete="off" className="max-w-sm" required />
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <div className="flex gap-2">
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "Eliminando…" : "Eliminar definitivamente"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <Button type="button" variant="destructive" className="mt-3" onClick={() => setOpen(true)}>
          Eliminar cliente
        </Button>
      )}
    </section>
  );
}
