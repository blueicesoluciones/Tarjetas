"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ACTING_BUSINESS_COOKIE, getStaffContext, homeForRole } from "@/lib/auth/staff";

export interface FormState {
  error?: string;
}

const loginSchema = z.object({
  email: z.string().trim().email("Email inválido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
  next: z.string().optional(),
});

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return { error: "Email o contraseña incorrectos" };

  const ctx = await getStaffContext();
  if (!ctx) {
    await supabase.auth.signOut();
    return { error: "Tu usuario no está habilitado. Contacta al administrador." };
  }

  const home = homeForRole(ctx.profile.role);
  const next = parsed.data.next;
  // Solo rutas internas permitidas para el rol (evita open redirect).
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") && canAccess(ctx.profile.role, next) ? next : null;
  redirect(safeNext ?? home);
}

function canAccess(role: string, path: string) {
  if (role === "super_admin") return true;
  if (path.startsWith("/admin")) return false;
  if (path.startsWith("/panel")) return role === "owner";
  return path.startsWith("/escaner");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  (await cookies()).delete(ACTING_BUSINESS_COOKIE);
  redirect("/login");
}

const passwordSchema = z
  .object({
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: "Las contraseñas no coinciden" });

export async function setPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = passwordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "No se pudo guardar la contraseña. Pide una nueva invitación." };

  const ctx = await getStaffContext();
  redirect(ctx ? homeForRole(ctx.profile.role) : "/login");
}
