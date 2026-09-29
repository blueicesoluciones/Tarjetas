import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStaffContext, homeForRole } from "@/lib/auth/staff";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Ingresar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const ctx = await getStaffContext();
  if (ctx) redirect(homeForRole(ctx.profile.role));
  const { next } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-3xl font-bold tracking-tight">Sellos</p>
          <p className="mt-1 text-sm text-muted-foreground">Ingreso para negocios y cajeros</p>
        </div>
        <LoginForm next={typeof next === "string" ? next : undefined} />
      </div>
    </main>
  );
}
