import "server-only";
import { cookies } from "next/headers";
import { planFeatures, type Plan } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Branch } from "@/types/db";

/**
 * Multisede (plan Pro). Una sola tarjeta por cliente para todas las sedes; cada
 * movimiento guarda su sede. Las sedes las crea el super admin.
 */

/** Filtro del panel del dueño («Todas las sedes» = sin cookie). */
export const PANEL_BRANCH_COOKIE = "panel_branch";
/** Sede desde la que el dueño usa el escáner (el cajero tiene la suya fija). */
export const SCANNER_BRANCH_COOKIE = "scanner_branch";

export async function listBranches(businessId: string, opts: { activeOnly?: boolean } = {}): Promise<Branch[]> {
  let query = createAdminClient().from("branches").select("*").eq("business_id", businessId).order("name");
  if (opts.activeOnly) query = query.eq("is_active", true);
  const { data } = await query.returns<Branch[]>();
  return data ?? [];
}

/** Sedes para mostrar selectores: vacío si el plan no incluye multisede. */
export async function branchesForPlan(businessId: string, plan: Plan): Promise<Branch[]> {
  if (!planFeatures(plan).multiBranch) return [];
  return listBranches(businessId);
}

/** Sede elegida en el panel, validada contra las del negocio. null = todas. */
export async function selectedPanelBranch(branches: Branch[]): Promise<Branch | null> {
  const id = (await cookies()).get(PANEL_BRANCH_COOKIE)?.value;
  return branches.find((b) => b.id === id) ?? null;
}

/** Sede elegida en el escáner por el dueño (solo sedes activas). */
export async function selectedScannerBranch(branches: Branch[]): Promise<Branch | null> {
  const id = (await cookies()).get(SCANNER_BRANCH_COOKIE)?.value;
  return branches.find((b) => b.id === id && b.is_active) ?? null;
}

/** Nombres de sede por id (para el historial). */
export function branchNames(branches: Branch[]): Map<string, string> {
  return new Map(branches.map((b) => [b.id, b.name]));
}

/**
 * Sede que se envía a add_stamp / redeem_*: la elegida en el escáner por el dueño,
 * si sigue activa en su negocio. Al cajero la base de datos le pone la suya.
 */
export async function scannerBranchId(businessId: string | null, role: string): Promise<string | null> {
  if (!businessId || role === "cashier") return null;
  const id = (await cookies()).get(SCANNER_BRANCH_COOKIE)?.value;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await createAdminClient()
    .from("branches")
    .select("id")
    .eq("id", id)
    .eq("business_id", businessId)
    .eq("is_active", true)
    .maybeSingle<{ id: string }>();
  return data?.id ?? null;
}
