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
import { loginSchema } from "@/lib/customers/schemas";

type FormInput = z.input<typeof loginSchema>;

interface Props {
  slug: string;
  buttonColor: string;
  buttonText: string;
  whatsappUrl: string | null;
}

export function LoginForm({ slug, buttonColor, buttonText, whatsappUrl }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showForgot, setShowForgot] = useState(false);

  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({ resolver: zodResolver(loginSchema), defaultValues: { slug, phone: "", pin: "" } });

  async function onSubmit(values: FormInput) {
    setServerError(null);
    const res = await postJson("/api/customers/login", values);
    if (res.ok && res.redirectTo) {
      router.replace(res.redirectTo);
      return;
    }
    resetField("pin");
    setServerError(res.error ?? "Ocurrió un error");
    if (res.code === "locked") setShowForgot(true);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="phone">Teléfono</Label>
        <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" className="h-11" {...register("phone")} />
        <FieldError message={errors.phone?.message} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pin">PIN</Label>
        <Input
          id="pin"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          maxLength={4}
          className="h-11 text-center text-lg tracking-[0.5em]"
          {...register("pin")}
        />
        <FieldError message={errors.pin?.message} />
      </div>
      {serverError ? (
        <p role="alert" className="text-sm text-destructive">
          {serverError}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isSubmitting}
        className="h-12 w-full rounded-xl text-base font-semibold disabled:opacity-60"
        style={{ backgroundColor: buttonColor, color: buttonText }}
      >
        {isSubmitting ? "Ingresando…" : "Ver mi tarjeta"}
      </button>

      <button type="button" onClick={() => setShowForgot((v) => !v)} className="w-full text-sm text-muted-foreground underline">
        Olvidé mi PIN
      </button>
      {showForgot ? (
        <div className="rounded-lg bg-muted p-3 text-sm">
          Pide al negocio que restablezca tu PIN. Te darán un PIN temporal para que crees uno nuevo.
          {whatsappUrl ? (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block font-medium underline">
              Escribir al negocio por WhatsApp
            </a>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
