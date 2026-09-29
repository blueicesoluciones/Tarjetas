"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { FieldError } from "@/components/customer/field-error";
import { postJson } from "@/components/customer/post-json";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePinSchema } from "@/lib/customers/schemas";

type FormInput = z.input<typeof changePinSchema>;

export function ChangePinForm({ buttonColor, buttonText }: { buttonColor: string; buttonText: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({ resolver: zodResolver(changePinSchema), defaultValues: { pin: "", pinConfirm: "" } });

  async function onSubmit(values: FormInput) {
    setServerError(null);
    const res = await postJson("/api/customers/change-pin", values);
    if (res.ok && res.redirectTo) router.replace(res.redirectTo);
    else setServerError(res.error ?? "Ocurrió un error");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <p className="text-sm text-muted-foreground">Tu PIN temporal ya funcionó. Ahora elige uno nuevo que solo tú conozcas.</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="pin">Nuevo PIN</Label>
          <Input id="pin" type="password" inputMode="numeric" maxLength={4} autoComplete="new-password" className="h-11 text-center text-lg tracking-[0.5em]" {...register("pin")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pinConfirm">Repite el PIN</Label>
          <Input id="pinConfirm" type="password" inputMode="numeric" maxLength={4} autoComplete="new-password" className="h-11 text-center text-lg tracking-[0.5em]" {...register("pinConfirm")} />
        </div>
      </div>
      <FieldError message={errors.pin?.message ?? errors.pinConfirm?.message} />
      {serverError ? <p role="alert" className="text-sm text-destructive">{serverError}</p> : null}
      <button
        type="submit"
        disabled={isSubmitting}
        className="h-12 w-full rounded-xl text-base font-semibold disabled:opacity-60"
        style={{ backgroundColor: buttonColor, color: buttonText }}
      >
        {isSubmitting ? "Guardando…" : "Guardar PIN"}
      </button>
    </form>
  );
}
