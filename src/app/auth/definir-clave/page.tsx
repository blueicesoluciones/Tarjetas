import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStaffContext } from "@/lib/auth/staff";
import { SetPasswordForm } from "./set-password-form";

export const metadata: Metadata = { title: "Definir contraseña" };

export default async function SetPasswordPage() {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/login");

  return (
    <main className="flex flex-1 items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-2xl font-bold tracking-tight">Hola, {ctx.profile.full_name}</p>
          <p className="mt-1 text-sm text-muted-foreground">Define tu contraseña para ingresar</p>
        </div>
        <SetPasswordForm />
      </div>
    </main>
  );
}
