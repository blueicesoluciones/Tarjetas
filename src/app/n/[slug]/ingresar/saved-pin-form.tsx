"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { FieldError } from "@/components/customer/field-error";
import { postJson } from "@/components/customer/post-json";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { savedLoginSchema } from "@/lib/customers/schemas";

type FormInput = z.input<typeof savedLoginSchema>;

interface Props {
  slug: string;
  firstName: string;
  buttonColor: string;
  buttonText: string;
  whatsappUrl: string | null;
}

/** Entrar a la tarjeta guardada en este equipo confirmando solo el PIN. */
export function SavedPinForm({ slug, firstName, buttonColor, buttonText, whatsappUrl }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showForgot, setShowForgot] = useState(false);
  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({ resolver: zodResolver(savedLoginSchema), defaultValues: { slug, pin: "" } });

  async function onSubmit(values: FormInput) {
    setServerError(null);
    const res = await postJson("/api/customers/login-saved", values);
    if (res.ok && res.redirectTo) {
      router.replace(res.redirectTo);
      return;
    }
    if (res.code === "no_saved_card") {
      router.replace(`/n/${slug}/ingresar`);
      return;
    }
    resetField("pin");
    setServerError(res.error === "Teléfono o PIN incorrectos" ? "PIN incorrecto" : (res.error ?? "Ocurrió un error"));
    if (res.code === "locked") setShowForgot(true);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <p className="text-lg font-semibold">Hola, {firstName}</p>
      <div className="space-y-1.5">
        <Label htmlFor="pin">Tu PIN</Label>
        <Input
          id="pin"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          autoFocus
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
        {isSubmitting ? "Verificando…" : "Ver mi tarjeta"}
      </button>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <Link href={`/n/${slug}`} className="underline">
          No soy {firstName}
        </Link>
        <button type="button" onClick={() => setShowForgot((v) => !v)} className="underline">
          Olvidé mi PIN
        </button>
      </div>
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
