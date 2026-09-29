import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, StaffRole } from "@/types/db";

export const ACTING_BUSINESS_COOKIE = "acting_business_id";

export interface StaffContext {
  userId: string;
  email: string | null;
  profile: Profile;
  /** Negocio efectivo: el propio, o el de "ver como" para super_admin. */
  businessId: string | null;
  impersonating: boolean;
}

/** Contexto del staff autenticado o null. Cacheado por request. */
export const getStaffContext = cache(async (): Promise<StaffContext | null> => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, business_id, is_active, created_at")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (!profile || !profile.is_active) return null;

  let businessId = profile.business_id;
  let impersonating = false;

  if (profile.role === "super_admin") {
    const acting = (await cookies()).get(ACTING_BUSINESS_COOKIE)?.value ?? null;
    if (acting && /^[0-9a-f-]{36}$/i.test(acting)) {
      businessId = acting;
      impersonating = true;
    }
  }

  return { userId: user.id, email: user.email ?? null, profile, businessId, impersonating };
});

/** Página por defecto según rol tras el login. */
export function homeForRole(role: StaffRole): string {
  switch (role) {
    case "super_admin":
      return "/admin";
    case "owner":
      return "/panel";
    case "cashier":
      return "/escaner";
  }
}

/**
 * Exige un staff con alguno de los roles dados. Para usar en layouts y páginas.
 * El super_admin siempre pasa; en /panel y /escaner necesita un negocio en "ver como".
 */
export async function requireStaff(roles: StaffRole[], opts: { needsBusiness?: boolean } = {}) {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/login");

  const allowed = ctx.profile.role === "super_admin" || roles.includes(ctx.profile.role);
  if (!allowed) redirect(homeForRole(ctx.profile.role));

  if (opts.needsBusiness && !ctx.businessId) {
    redirect("/admin/negocios?elige=1");
  }
  return ctx as StaffContext & { businessId: string | null };
}

/** Variante para Route Handlers: devuelve null en vez de redirigir. */
export async function staffForApi(roles: StaffRole[]): Promise<StaffContext | null> {
  const ctx = await getStaffContext();
  if (!ctx) return null;
  if (ctx.profile.role !== "super_admin" && !roles.includes(ctx.profile.role)) return null;
  return ctx;
}
