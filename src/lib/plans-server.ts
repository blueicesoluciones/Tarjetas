import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { canAddCashier, planFeatures, type Plan } from "@/lib/plans";

export async function getBusinessPlan(businessId: string): Promise<Plan> {
  const { data } = await createAdminClient()
    .from("businesses")
    .select("plan")
    .eq("id", businessId)
    .maybeSingle<{ plan: Plan }>();
  return data?.plan ?? "standard";
}

export async function countActiveCashiers(businessId: string): Promise<number> {
  const { count } = await createAdminClient()
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("role", "cashier")
    .eq("is_active", true);
  return count ?? 0;
}

/** Mensaje de error si el plan no permite otro cajero activo; null si se puede. */
export async function cashierLimitError(businessId: string): Promise<string | null> {
  const plan = await getBusinessPlan(businessId);
  if (canAddCashier(plan, await countActiveCashiers(businessId))) return null;
  const f = planFeatures(plan);
  return `El plan ${f.label} incluye hasta ${f.maxCashiers} cajeros activos. Desactiva uno o sube de plan.`;
}
