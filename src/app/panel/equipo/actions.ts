"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { writeAudit } from "@/lib/audit";
import { requireStaff } from "@/lib/auth/staff";
import { cashierLimitError } from "@/lib/plans-server";
import { createClient } from "@/lib/supabase/server";
import { deleteCashierUser } from "@/lib/staff-users";

const toggleSchema = z.object({ profileId: z.guid(), active: z.enum(["true", "false"]) });

export async function setCashierActive(formData: FormData): Promise<void> {
  const ctx = await requireStaff(["owner"], { needsBusiness: true });
  const parsed = toggleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const active = parsed.data.active === "true";
  if (active && (await cashierLimitError(ctx.businessId!))) return;

  // RLS: el owner solo puede actualizar cajeros de su negocio.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ is_active: active })
    .eq("id", parsed.data.profileId)
    .eq("business_id", ctx.businessId!)
    .eq("role", "cashier")
    .select("id");
  if (error || !data?.length) {
    console.error("[panel] setCashierActive", error?.message ?? "sin filas");
    return;
  }

  await writeAudit({
    businessId: ctx.businessId,
    actorId: ctx.userId,
    action: active ? "staff.activate" : "staff.deactivate",
    entityType: "profile",
    entityId: parsed.data.profileId,
    impersonating: ctx.impersonating,
  });
  revalidatePath("/panel/equipo");
}

export async function deleteCashier(formData: FormData): Promise<void> {
  const ctx = await requireStaff(["owner"], { needsBusiness: true });
  const parsed = z.object({ profileId: z.guid() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const result = await deleteCashierUser(parsed.data.profileId, ctx.businessId!);
  if (!result.ok) return;
  await writeAudit({
    businessId: ctx.businessId,
    actorId: ctx.userId,
    action: "staff.delete",
    entityType: "profile",
    entityId: parsed.data.profileId,
    metadata: { full_name: result.fullName },
    impersonating: ctx.impersonating,
  });
  revalidatePath("/panel/equipo");
}
