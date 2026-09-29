"use client";

import { useActionState } from "react";
import Link from "next/link";
import { BusinessFields, EMPTY_BUSINESS } from "@/components/admin/business-fields";
import { Field } from "@/components/admin/fields";
import { FormStatus } from "@/components/admin/form-status";
import { EMPTY_PROGRAM, ProgramFields } from "@/components/admin/program-fields";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createBusiness, type AdminFormState } from "../actions";

export function NewBusinessForm() {
  const [state, action, pending] = useActionState<AdminFormState, FormData>(createBusiness, {});

  if (state.createdId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Listo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormStatus error={state.error} success={state.success} />
          <div className="flex flex-wrap gap-2">
            <Link href={`/admin/negocios/${state.createdId}`} className={buttonVariants()}>
              Ver negocio
            </Link>
            <Link href="/admin/negocios" className={buttonVariants({ variant: "outline" })}>
              Volver a la lista
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form action={action} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Negocio</CardTitle>
          <CardDescription>Marca y datos de operación.</CardDescription>
        </CardHeader>
        <CardContent>
          <BusinessFields defaults={EMPTY_BUSINESS} isNew />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Programa de sellos</CardTitle>
        </CardHeader>
        <CardContent>
          <ProgramFields defaults={EMPTY_PROGRAM} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dueño</CardTitle>
          <CardDescription>Usuario con el que el dueño ingresa a su panel. Entrégale estas credenciales.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre completo" name="owner_name" required maxLength={80} />
          <Field label="Email (usuario para ingresar)" name="owner_email" type="email" required autoComplete="off" />
          <Field label="Contraseña" name="owner_password" type="text" required minLength={8} autoComplete="new-password" />
        </CardContent>
      </Card>

      <FormStatus error={state.error} />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Creando…" : "Crear negocio"}
      </Button>
    </form>
  );
}
