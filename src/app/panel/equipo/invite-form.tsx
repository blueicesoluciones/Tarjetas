"use client";

import { useActionState } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inviteCashier, type InviteState } from "./actions";

export function InviteForm() {
  const [state, action, pending] = useActionState<InviteState, FormData>(inviteCashier, {});

  return (
    <form action={action} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="fullName">Nombre</Label>
        <Input id="fullName" name="fullName" required maxLength={80} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}
      {state.inviteUrl ? (
        <div className="space-y-2 rounded-lg bg-muted p-3">
          <p className="font-mono text-xs break-all">{state.inviteUrl}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              navigator.clipboard.writeText(state.inviteUrl!).then(
                () => toast.success("Enlace copiado"),
                () => toast.error("No se pudo copiar"),
              )
            }
          >
            <Copy /> Copiar enlace
          </Button>
        </div>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Invitando…" : "Enviar invitación"}
      </Button>
      <p className="text-xs text-muted-foreground">
        El cajero podrá escanear tarjetas, sumar sellos y canjear premios. No puede ver datos de contacto ni restablecer PIN.
      </p>
    </form>
  );
}
