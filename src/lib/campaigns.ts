import "server-only";
import { startOfLocalMonth } from "@/lib/panel/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { googleWallet } from "@/lib/wallet";
import { sendGoogleWalletMessage } from "@/lib/wallet/google";

/**
 * Destinatarios de un aviso promocional: tarjetas activas guardadas en Google
 * Wallet de clientes que aceptaron recibir promociones (Ley 1581).
 * TODO(apple): sumar los pases de Apple Wallet cuando esté activo.
 */
export async function campaignAudience(businessId: string): Promise<{ cardId: string; objectId: string }[]> {
  const { data } = await createAdminClient()
    .from("cards")
    .select("id, google_object_id, customers!inner(marketing_consent, deleted_at)")
    .eq("business_id", businessId)
    .eq("status", "active")
    .not("google_object_id", "is", null)
    .eq("customers.marketing_consent", true)
    .is("customers.deleted_at", null)
    .returns<{ id: string; google_object_id: string }[]>();
  return (data ?? []).map((c) => ({ cardId: c.id, objectId: c.google_object_id }));
}

/** Campañas enviadas en el mes calendario actual (zona horaria del negocio). */
export async function campaignsThisMonth(businessId: string, timeZone: string): Promise<number> {
  const { count } = await createAdminClient()
    .from("wallet_campaigns")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .neq("status", "failed")
    .gte("created_at", startOfLocalMonth(timeZone).toISOString());
  return count ?? 0;
}

/** Envía un mensaje a varios pases con concurrencia limitada. */
export async function deliverWalletMessage(
  objectIds: string[],
  header: string,
  body: string,
  concurrency = 5,
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  if (!googleWallet.isEnabled()) return { sent, failed: objectIds.length };
  for (let i = 0; i < objectIds.length; i += concurrency) {
    const batch = objectIds.slice(i, i + concurrency);
    const results = await Promise.allSettled(batch.map((id) => sendGoogleWalletMessage(id, header, body)));
    for (const r of results) {
      if (r.status === "fulfilled") sent++;
      else {
        failed++;
        console.error("[campaign] envío fallido", r.reason instanceof Error ? r.reason.message : r.reason);
      }
    }
  }
  return { sent, failed };
}

/** Ejecuta una campaña ya registrada y guarda el resultado. */
export async function runCampaign(campaignId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: campaign } = await admin
    .from("wallet_campaigns")
    .select("id, business_id, title, message")
    .eq("id", campaignId)
    .maybeSingle<{ id: string; business_id: string; title: string; message: string }>();
  if (!campaign) return;

  try {
    const audience = await campaignAudience(campaign.business_id);
    const { sent, failed } = await deliverWalletMessage(
      audience.map((a) => a.objectId),
      campaign.title,
      campaign.message,
    );
    await admin
      .from("wallet_campaigns")
      .update({
        status: audience.length > 0 && sent === 0 ? "failed" : "sent",
        recipients: audience.length,
        sent_count: sent,
        failed_count: failed,
        finished_at: new Date().toISOString(),
      })
      .eq("id", campaign.id);
  } catch (err) {
    console.error("[campaign]", campaign.id, err instanceof Error ? err.message : err);
    await admin
      .from("wallet_campaigns")
      .update({ status: "failed", finished_at: new Date().toISOString() })
      .eq("id", campaign.id);
  }
}
