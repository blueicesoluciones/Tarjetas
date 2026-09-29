"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { writeAudit } from "@/lib/audit";
import { requireStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";

const toggleSchema = z.object({ profileId: z.guid(), active: z.enum(["true", "false"]) });

export async function setCashierActive(formData: FormData): Promise<void> {
  const ctx = await requireStaff(["owner"], { needsBusiness: true });
  const parsed = toggleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const active = parsed.data.active === "true";

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
