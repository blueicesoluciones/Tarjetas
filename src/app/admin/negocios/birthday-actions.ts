"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { writeAudit } from "@/lib/audit";
import { getStaffContext } from "@/lib/auth/staff";
import { BIRTHDAY_REMINDER_ACTION, birthdayReminderAudience, sendBirthdayReminder } from "@/lib/campaigns";
import { createAdminClient } from "@/lib/supabase/admin";

export interface BirthdayReminderState {
  error?: string;
  success?: string;
}

const MIN_DAYS_BETWEEN = 7;

/** Envía por Wallet el aviso «Actualiza tu información» a quienes no tienen cumpleaños. */
export async function sendBirthdayReminderAction(businessId: string): Promise<BirthdayReminderState> {
  const ctx = await getStaffContext();
  if (!ctx || ctx.profile.role !== "super_admin") redirect("/login");
  const id = z.guid().parse(businessId);
  const admin = createAdminClient();

  const since = new Date(Date.now() - MIN_DAYS_BETWEEN * 86_400_000).toISOString();
  const { count: recent } = await admin
    .from("audit_logs")
    .select("id", { count: "exact", head: true })
    .eq("business_id", id)
    .eq("action", BIRTHDAY_REMINDER_ACTION)
    .gte("created_at", since);
  if ((recent ?? 0) > 0) return { error: `Ya se envió en los últimos ${MIN_DAYS_BETWEEN} días. Espera para no saturar a los clientes.` };

  const targets = await birthdayReminderAudience(id);
  if (targets.length === 0) return { error: "No hay tarjetas en Wallet sin cumpleaños." };

  after(async () => {
    const { sent, failed } = await sendBirthdayReminder(targets);
    await writeAudit({
      businessId: id,
      actorId: ctx.userId,
      action: BIRTHDAY_REMINDER_ACTION,
      entityType: "business",
      entityId: id,
      metadata: { recipients: targets.length, sent, failed },
    });
  });
  revalidatePath(`/admin/negocios/${id}`);
  return {
    success: `Enviando el aviso a ${targets.length} ${targets.length === 1 ? "tarjeta" : "tarjetas"}. Les llega en unos segundos.`,
  };
}
