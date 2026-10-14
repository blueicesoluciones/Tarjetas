"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WINBACK_DAY_OPTIONS } from "@/lib/winback";
import { saveWinback, type WinbackFormState } from "./winback-actions";

export function WinbackForm({ days, message }: { days: number | null; message: string }) {
  const [state, action, pending] = useActionState<WinbackFormState, FormData>(saveWinback, {});
  const [enabled, setEnabled] = useState(days !== null);

  useEffect(() => {
    if (state.success) toast.success(state.success);
    else if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aviso «Te extrañamos»</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Cada día revisamos quién lleva varios días sin venir y le enviamos este aviso a su Google Wallet o Apple Wallet, una sola vez
            por ausencia. Solo llega a quienes aceptaron recibir promociones.
          </p>
          <label className="flex items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              name="enabled"
              value="on"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="size-5"
            />
            Activar el aviso automático
          </label>
          <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
            <div className="space-y-1.5">
              <Label htmlFor="winback-days">Enviar después de</Label>
              <select
                id="winback-days"
                name="days"
                defaultValue={days ?? 30}
                disabled={!enabled}
                className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm disabled:opacity-50"
              >
                {WINBACK_DAY_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d} días sin venir
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="winback-message">Mensaje</Label>
              <Textarea id="winback-message" name="message" defaultValue={message} maxLength={200} rows={2} disabled={!enabled} />
            </div>
          </div>
          {/* Con la casilla desmarcada los campos van deshabilitados: se envían ocultos para validar igual. */}
          {!enabled ? (
            <>
              <input type="hidden" name="days" value={days ?? 30} />
              <input type="hidden" name="message" value={message} />
            </>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : "Guardar aviso"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
