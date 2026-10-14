"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { writeAudit } from "@/lib/audit";
import { getBusinessWithProgram } from "@/lib/auth/business";
import { requireStaff } from "@/lib/auth/staff";
import { planFeatures } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";

export interface WinbackFormState {
  error?: string;
  success?: string;
}

const schema = z.object({
  enabled: z.enum(["on", "off"]).default("off"),
  days: z.coerce.number().int().min(7).max(365),
  message: z.string().trim().min(5, "Escribe el mensaje").max(200, "Máximo 200 caracteres"),
});

export async function saveWinback(_prev: WinbackFormState, formData: FormData): Promise<WinbackFormState> {
  const ctx = await requireStaff(["owner"], { needsBusiness: true });
  const parsed = schema.safeParse({ enabled: formData.get("enabled") ?? "off", days: formData.get("days"), message: formData.get("message") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { business, program } = await getBusinessWithProgram(ctx.businessId!);
  if (!business || !program) return { error: "Programa no encontrado" };
  if (!planFeatures(business.plan).winback) return { error: "El aviso «Te extrañamos» está disponible en el plan Pro" };

  const enabled = parsed.data.enabled === "on";
  const { error } = await createAdminClient()
    .from("programs")
    .update({ winback_days: enabled ? parsed.data.days : null, winback_message: parsed.data.message })
    .eq("id", program.id);
  if (error) return { error: "No se pudo guardar" };

  await writeAudit({
    businessId: business.id,
    actorId: ctx.userId,
    action: "program.winback_update",
    entityType: "program",
    entityId: program.id,
    metadata: { enabled, days: parsed.data.days },
    impersonating: ctx.impersonating,
  });
  revalidatePath("/panel/programa");
  return { success: enabled ? `Activado: se avisará a quien lleve ${parsed.data.days} días sin venir` : "Aviso desactivado" };
}
