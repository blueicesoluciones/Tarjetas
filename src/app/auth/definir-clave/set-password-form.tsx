"use client";

import { useActionState } from "react";
import { setPassword, type FormState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SetPasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(setPassword, {});
  return (
    <Card>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nueva contraseña</Label>
            <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className="h-11" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Repite la contraseña</Label>
            <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required className="h-11" />
          </div>
          {state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}
          <Button type="submit" className="h-11 w-full" disabled={pending}>
            {pending ? "Guardando…" : "Guardar y entrar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
