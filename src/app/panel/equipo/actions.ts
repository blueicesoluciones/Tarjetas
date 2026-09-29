"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { writeAudit } from "@/lib/audit";
import { getBusinessWithProgram } from "@/lib/auth/business";
import { requireStaff } from "@/lib/auth/staff";
import { inviteStaff } from "@/lib/staff-invite";
import { createClient } from "@/lib/supabase/server";

export interface InviteState {
  error?: string;
  success?: string;
  inviteUrl?: string | null;
}

const inviteSchema = z.object({
  fullName: z.string().trim().min(2, "Ingresa el nombre").max(80),
  email: z.string().trim().toLowerCase().email("Email inválido"),
});

export async function inviteCashier(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const ctx = await requireStaff(["owner"], { needsBusiness: true });
  const parsed = inviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { business } = await getBusinessWithProgram(ctx.businessId!);
  if (!business) return { error: "Negocio no encontrado" };

  const result = await inviteStaff({
    email: parsed.data.email,
    fullName: parsed.data.fullName,
    role: "cashier",
    businessId: business.id,
    businessName: business.name,
  });
  if (!result.ok) return { error: result.error };

  await writeAudit({
    businessId: business.id,
    actorId: ctx.userId,
    action: "staff.invite",
    entityType: "profile",
    entityId: result.userId,
    metadata: { role: "cashier", email_sent: result.emailSent },
    impersonating: ctx.impersonating,
  });
  revalidatePath("/panel/equipo");
  return {
    success: result.emailSent
      ? `Invitación enviada a ${parsed.data.email}`
      : "Invitación creada. No hay email configurado: comparte este enlace con la persona.",
    inviteUrl: result.inviteUrl,
  };
}

const toggleSchema = z.object({ profileId: z.string().uuid(), active: z.enum(["true", "false"]) });

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
