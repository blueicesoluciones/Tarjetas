import "server-only";
import { BIRTHDAY_REMINDER_BODY, BIRTHDAY_REMINDER_TITLE } from "@/lib/domain/birthday";
import { startOfLocalMonth } from "@/lib/panel/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { appleWallet, googleWallet, syncCardEverywhere } from "@/lib/wallet";
import { pushPassUpdate } from "@/lib/wallet/apns";
import { sendGoogleWalletMessage } from "@/lib/wallet/google";

/** Pase al que llega un aviso: Google Wallet, Apple Wallet o ambos. */
export interface WalletTarget {
  cardId: string;
  objectId: string | null;
  appleSerial: string | null;
}

/**
 * Destinatarios de un aviso promocional: tarjetas activas guardadas en Google o
 * Apple Wallet de clientes que aceptaron recibir promociones (Ley 1581).
 */
export async function campaignAudience(businessId: string): Promise<WalletTarget[]> {
  const { data } = await createAdminClient()
    .from("cards")
    .select("id, google_object_id, apple_serial_number, customers!inner(marketing_consent, deleted_at)")
    .eq("business_id", businessId)
    .eq("status", "active")
    .or("google_object_id.not.is.null,apple_serial_number.not.is.null")
    .eq("customers.marketing_consent", true)
    .is("customers.deleted_at", null)
    .returns<{ id: string; google_object_id: string | null; apple_serial_number: string | null }[]>();
  return (data ?? []).map((c) => ({ cardId: c.id, objectId: c.google_object_id, appleSerial: c.apple_serial_number }));
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

/**
 * El iPhone solo avisa si el texto cambia. Si se repite el mismo mensaje (ej. «Te
 * extrañamos» cada mes), se alterna un espacio invisible al final para que cuente
 * como cambio sin que se note.
 */
export function appleMessageValue(message: string, previous: string | null): string {
  const base = message.slice(0, 399);
  return previous === base ? `${base}\u200B` : base;
}

/** Envía el aviso a un pase. Apple: se guarda en la tarjeta y se avisa al iPhone. */
async function deliverOne(target: WalletTarget, header: string, body: string): Promise<boolean> {
  const tasks: Promise<unknown>[] = [];
  if (target.objectId && googleWallet.isEnabled()) tasks.push(sendGoogleWalletMessage(target.objectId, header, body));
  if (target.appleSerial && appleWallet.isEnabled()) {
    tasks.push(
      (async () => {
        const admin = createAdminClient();
        const { data: card } = await admin.from("cards").select("apple_message").eq("id", target.cardId).maybeSingle<{ apple_message: string | null }>();
        await admin.from("cards").update({ apple_message: appleMessageValue(`${header}: ${body}`, card?.apple_message ?? null) }).eq("id", target.cardId);
        await pushPassUpdate(target.appleSerial!);
      })(),
    );
  }
  if (tasks.length === 0) return false;
  const results = await Promise.allSettled(tasks);
  for (const r of results) {
    if (r.status === "rejected") console.error("[campaign] envío fallido", r.reason instanceof Error ? r.reason.message : r.reason);
  }
  return results.some((r) => r.status === "fulfilled");
}

/** Envía un mensaje a varios pases con concurrencia limitada. */
export async function deliverWalletMessage(
  targets: WalletTarget[],
  header: string,
  body: string,
  concurrency = 5,
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < targets.length; i += concurrency) {
    const results = await Promise.all(targets.slice(i, i + concurrency).map((t) => deliverOne(t, header, body)));
    for (const ok of results) {
      if (ok) sent++;
      else failed++;
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
      audience,
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

/** Acción de auditoría del aviso de cumpleaños (también sirve para saber cuándo se envió). */
export const BIRTHDAY_REMINDER_ACTION = "wallet.birthday_reminder";

/**
 * Pases en Wallet de clientes que no han dado su cumpleaños (inscritos antes de
 * pedirlo). Es un aviso de servicio, no promocional: no exige consentimiento.
 */
export async function birthdayReminderAudience(businessId: string): Promise<WalletTarget[]> {
  const { data } = await createAdminClient()
    .from("cards")
    .select("id, google_object_id, apple_serial_number, customers!inner(birth_month, deleted_at)")
    .eq("business_id", businessId)
    .eq("status", "active")
    .or("google_object_id.not.is.null,apple_serial_number.not.is.null")
    .is("customers.birth_month", null)
    .is("customers.deleted_at", null)
    .returns<{ id: string; google_object_id: string | null; apple_serial_number: string | null }[]>();
  return (data ?? []).map((c) => ({ cardId: c.id, objectId: c.google_object_id, appleSerial: c.apple_serial_number }));
}

/**
 * Pide el cumpleaños por Wallet: primero actualiza cada pase (Google recibe el
 * enlace «Agregar mi cumpleaños»; Apple, el campo con el enlace) y luego envía el aviso.
 */
export async function sendBirthdayReminder(targets: WalletTarget[]): Promise<{ sent: number; failed: number }> {
  for (let i = 0; i < targets.length; i += 5) {
    await Promise.all(targets.slice(i, i + 5).map((t) => syncCardEverywhere(t.cardId)));
  }
  return deliverWalletMessage(targets, BIRTHDAY_REMINDER_TITLE, BIRTHDAY_REMINDER_BODY);
}
