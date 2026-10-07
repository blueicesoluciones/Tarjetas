import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffContext, homeForRole } from "@/lib/auth/staff";
import { StampLogoStacked } from "@/components/brand/logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Ingresar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const ctx = await getStaffContext();
  if (ctx) redirect(homeForRole(ctx.profile.role));
  const { next } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center bg-paper px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Link href="/" aria-label="stamp, inicio">
            <StampLogoStacked width={132} />
          </Link>
          <p className="mt-4 text-sm text-muted-foreground">Ingreso para negocios y cajeros</p>
        </div>
        <LoginForm next={typeof next === "string" ? next : undefined} />
      </div>
    </main>
  );
}
