import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Business, Program } from "@/types/db";

/**
 * Negocio y programa activo del contexto de staff. Se consulta con service role
 * porque el super_admin en "ver como" no tiene business_id propio; el llamador
 * ya validó el acceso con requireStaff.
 */
export const getBusinessWithProgram = cache(async (businessId: string) => {
  const admin = createAdminClient();
  const [{ data: business }, { data: program }] = await Promise.all([
    admin.from("businesses").select("*").eq("id", businessId).maybeSingle<Business>(),
    admin.from("programs").select("*").eq("business_id", businessId).eq("is_active", true).maybeSingle<Program>(),
  ]);
  return { business, program };
});
