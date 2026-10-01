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
import { phoneFieldHint } from "@/lib/domain/phone";
import { registerSchema } from "@/lib/customers/schemas";

type FormInput = z.input<typeof registerSchema>;
type FormOutput = z.output<typeof registerSchema>;

export function RegisterForm({
  slug,
  country,
  buttonColor,
  buttonText,
}: {
  slug: string;
  country: string;
  buttonColor: string;
  buttonText: string;
}) {
  const phone = phoneFieldHint(country);
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { slug, fullName: "", phone: "", email: "", pin: "", pinConfirm: "", marketingConsent: false },
  });

  async function onSubmit(values: FormOutput) {
    setServerError(null);
    setDuplicate(false);
    const res = await postJson("/api/customers/register", values);
    if (res.ok && res.redirectTo) {
      router.replace(res.redirectTo);
      return;
    }
    if (res.code === "duplicate") {
      setDuplicate(true);
      return;
    }
    if (res.field === "phone") setError("phone", { message: res.error });
    else setServerError(res.error ?? "Ocurrió un error");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="fullName">Nombre</Label>
        <Input id="fullName" autoComplete="name" className="h-11" {...register("fullName")} />
        <FieldError message={errors.fullName?.message} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="phone">Celular</Label>
        <Input
          id="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder={phone.placeholder}
          className="h-11"
          {...register("phone")}
        />
        {phone.hint && !errors.phone ? <p className="text-xs text-muted-foreground">{phone.hint}</p> : null}
        <FieldError message={errors.phone?.message} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">
          Email <span className="font-normal text-muted-foreground">(opcional)</span>
        </Label>
        <Input id="email" type="email" autoComplete="email" className="h-11" {...register("email")} />
        <FieldError message={errors.email?.message} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="pin">PIN (4 dígitos)</Label>
          <Input
            id="pin"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            maxLength={4}
            className="h-11 text-center text-lg tracking-[0.5em]"
            {...register("pin")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pinConfirm">Repite el PIN</Label>
          <Input
            id="pinConfirm"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            maxLength={4}
            className="h-11 text-center text-lg tracking-[0.5em]"
            {...register("pinConfirm")}
          />
        </div>
      </div>
      <FieldError message={errors.pin?.message ?? errors.pinConfirm?.message} />
      <p className="text-xs text-muted-foreground">Usarás este PIN para entrar a tu tarjeta desde otro teléfono.</p>

      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-current" {...register("privacyAccepted")} />
        <span>
          Acepto la{" "}
          <Link href="/privacidad" target="_blank" className="underline">
            política de privacidad
          </Link>
        </span>
      </label>
      <FieldError message={errors.privacyAccepted?.message} />
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" className="mt-0.5 size-5 shrink-0" {...register("marketingConsent")} />
        <span>Quiero recibir promociones de este negocio</span>
      </label>

      {duplicate ? (
        <div role="alert" className="rounded-lg bg-muted p-3 text-sm">
          Ya tienes una tarjeta en este negocio.{" "}
          <Link href={`/n/${slug}/ingresar`} className="font-medium underline">
            Ingresa con tu teléfono y PIN
          </Link>
        </div>
      ) : null}
      {serverError ? (
        <p role="alert" className="text-sm text-destructive">
          {serverError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="h-12 w-full rounded-xl text-base font-semibold transition-opacity disabled:opacity-60"
        style={{ backgroundColor: buttonColor, color: buttonText }}
      >
        {isSubmitting ? "Creando tu tarjeta…" : "Crear mi tarjeta"}
      </button>
    </form>
  );
}
