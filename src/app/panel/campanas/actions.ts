"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { writeAudit } from "@/lib/audit";
import { getBusinessWithProgram } from "@/lib/auth/business";
import { requireStaff } from "@/lib/auth/staff";
import { campaignAudience, campaignsThisMonth, runCampaign } from "@/lib/campaigns";
import { campaignsLeft, planFeatures } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";

export interface CampaignFormState {
  error?: string;
  success?: string;
}

const schema = z.object({
  title: z.string().trim().min(3, "Escribe un título corto").max(60, "Máximo 60 caracteres"),
  message: z.string().trim().min(5, "Escribe el mensaje").max(300, "Máximo 300 caracteres"),
});

export async function sendCampaign(_prev: CampaignFormState, formData: FormData): Promise<CampaignFormState> {
  const ctx = await requireStaff(["owner"], { needsBusiness: true });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { business } = await getBusinessWithProgram(ctx.businessId!);
  if (!business) return { error: "Negocio no encontrado" };
  const plan = planFeatures(business.plan);
  if (plan.campaignsPerMonth === 0) return { error: "Las campañas están disponibles desde el plan Medium" };

  const left = campaignsLeft(business.plan, await campaignsThisMonth(business.id, business.timezone));
  if (left === 0) {
    return { error: `Ya enviaste las ${plan.campaignsPerMonth} campañas de este mes. El plan Pro no tiene límite mensual.` };
  }

  const audience = await campaignAudience(business.id);
  if (audience.length === 0) {
    return { error: "Aún no hay clientes con la tarjeta en Google o Apple Wallet que acepten promociones." };
  }

  const { data: campaign, error } = await createAdminClient()
    .from("wallet_campaigns")
    .insert({
      business_id: business.id,
      title: parsed.data.title,
      message: parsed.data.message,
      created_by: ctx.userId,
      recipients: audience.length,
    })
    .select("id")
    .single<{ id: string }>();
  if (error || !campaign) return { error: "No se pudo crear la campaña" };

  await writeAudit({
    businessId: business.id,
    actorId: ctx.userId,
    action: "campaign.send",
    entityType: "wallet_campaign",
    entityId: campaign.id,
    metadata: { recipients: audience.length, title: parsed.data.title },
    impersonating: ctx.impersonating,
  });

  // El envío corre en segundo plano; el historial muestra el resultado.
  after(() => runCampaign(campaign.id));
  revalidatePath("/panel/campanas");
  return { success: `Enviando a ${audience.length} ${audience.length === 1 ? "cliente" : "clientes"}…` };
}
