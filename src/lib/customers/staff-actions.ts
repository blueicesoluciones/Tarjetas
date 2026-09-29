import "server-only";
import { randomInt } from "node:crypto";
import { hash } from "bcryptjs";
import { writeAudit } from "@/lib/audit";
import type { StaffContext } from "@/lib/auth/staff";
import { resetLockState } from "@/lib/domain/lockout";
import { generateTempPin } from "@/lib/domain/pin";
import { newAccessToken } from "@/lib/domain/tokens";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { BCRYPT_COST } from "./service";

const TEMP_PIN_HOURS = 24;

/**
 * Verifica con la sesión del staff (RLS) que el cliente pertenece a su negocio.
 * Solo owner y super_admin pueden leer customers.
 */
export async function customerForOwner(ctx: StaffContext, customerId: string) {
  if (ctx.profile.role === "cashier") return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("customers")
    .select("id, business_id, full_name, deleted_at")
    .eq("id", customerId)
    .maybeSingle<{ id: string; business_id: string; full_name: string; deleted_at: string | null }>();
  if (!data || data.deleted_at) return null;
  if (ctx.businessId && data.business_id !== ctx.businessId) return null;
  return data;
}

/**
 * Restablece el PIN. El dueño puede elegir el PIN temporal o dejar que se genere.
 * Devuelve el PIN temporal (se muestra una sola vez).
 */
export async function resetCustomerPin(ctx: StaffContext, customerId: string, chosenPin?: string) {
  const customer = await customerForOwner(ctx, customerId);
  if (!customer) return null;

  const tempPin = chosenPin ?? generateTempPin((max) => randomInt(max));
  const lock = resetLockState();
  const { error } = await createAdminClient()
    .from("customers")
    .update({
      pin_hash: await hash(tempPin, BCRYPT_COST),
      pin_must_change: true,
      pin_temp_expires_at: new Date(Date.now() + TEMP_PIN_HOURS * 3600_000).toISOString(),
      pin_failed_attempts: lock.pinFailedAttempts,
      pin_locked_until: null,
      pin_lockout_count: lock.pinLockoutCount,
    })
    .eq("id", customer.id);
  if (error) throw new Error(error.message);

  await writeAudit({
    businessId: customer.business_id,
    actorId: ctx.userId,
    action: "pin.reset",
    entityType: "customer",
    entityId: customer.id,
    metadata: { chosen_by_staff: Boolean(chosenPin) },
    impersonating: ctx.impersonating,
  });
  return { tempPin, expiresInHours: TEMP_PIN_HOURS };
}

/** Regenera el enlace personal (invalida el anterior). */
export async function regenerateCustomerLink(ctx: StaffContext, customerId: string) {
  const customer = await customerForOwner(ctx, customerId);
  if (!customer) return null;

  const admin = createAdminClient();
  const accessToken = newAccessToken();
  const { data, error } = await admin
    .from("cards")
    .update({ access_token: accessToken })
    .eq("customer_id", customer.id)
    .select("id")
    .returns<{ id: string }[]>();
  if (error) throw new Error(error.message);

  await writeAudit({
    businessId: customer.business_id,
    actorId: ctx.userId,
    action: "card.regenerate_link",
    entityType: "customer",
    entityId: customer.id,
    metadata: { card_ids: (data ?? []).map((c) => c.id) },
    impersonating: ctx.impersonating,
  });
  return { accessToken };
}

/**
 * Elimina los datos personales del cliente a pedido (CLAUDE.md §16). Conserva
 * tarjeta y eventos anonimizados para estadísticas.
 */
export async function deleteCustomerData(ctx: StaffContext, customerId: string) {
  const customer = await customerForOwner(ctx, customerId);
  if (!customer) return null;
  const admin = createAdminClient();

  const { error } = await admin
    .from("customers")
    .update({
      full_name: "Cliente eliminado",
      phone_e164: `deleted:${customer.id}`,
      email: null,
      pin_hash: "!",
      marketing_consent: false,
      deleted_at: new Date().toISOString(),
    })
    .eq("id", customer.id);
  if (error) throw new Error(error.message);

  await admin
    .from("cards")
    .update({ status: "blocked", access_token: newAccessToken() })
    .eq("customer_id", customer.id);

  await writeAudit({
    businessId: customer.business_id,
    actorId: ctx.userId,
    action: "customer.delete",
    entityType: "customer",
    entityId: customer.id,
    impersonating: ctx.impersonating,
  });
  return { ok: true };
}
