import "server-only";
import { compare, hash } from "bcryptjs";
import { after } from "next/server";
import { writeAudit } from "@/lib/audit";
import { clearPinChangeTicket, getPinChangeTicket, setCustomerSession, setPinChangeTicket } from "@/lib/customer-session";
import {
  getLockStatus,
  registerFailedAttempt,
  registerSuccess,
  type PinLockState,
} from "@/lib/domain/lockout";
import { normalizePhone } from "@/lib/domain/phone";
import { newAccessToken, newPublicCode } from "@/lib/domain/tokens";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCardEverywhere } from "@/lib/wallet";
import type { Business, Customer, Program } from "@/types/db";
import type { z } from "zod";
import type { changePinSchema, loginSchema, registerSchema } from "./schemas";

export const BCRYPT_COST = 10;

// Hash de relleno para comparar cuando el teléfono no existe (tiempo de respuesta similar).
const DUMMY_HASH = "$2b$10$49oNjZZZnIgvHylvDnHjuuF83mSW4KzQlNiVzmBZf6wn50fPQMy5G";

export type ServiceResult<T = { redirectTo: string }> =
  | ({ ok: true } & T)
  | { ok: false; error: string; code?: string; status?: number; field?: string };

const GENERIC_LOGIN_ERROR = "Teléfono o PIN incorrectos";

export async function getBusinessBySlug(slug: string) {
  const admin = createAdminClient();
  const { data: business } = await admin.from("businesses").select("*").eq("slug", slug).maybeSingle<Business>();
  if (!business) return { business: null, program: null };
  const { data: program } = await admin
    .from("programs")
    .select("*")
    .eq("business_id", business.id)
    .eq("is_active", true)
    .maybeSingle<Program>();
  return { business, program };
}

function lockState(c: Customer): PinLockState {
  return {
    pinFailedAttempts: c.pin_failed_attempts,
    pinLockedUntil: c.pin_locked_until ? new Date(c.pin_locked_until) : null,
    pinLockoutCount: c.pin_lockout_count,
  };
}

function lockColumns(s: PinLockState) {
  return {
    pin_failed_attempts: s.pinFailedAttempts,
    pin_locked_until: s.pinLockedUntil?.toISOString() ?? null,
    pin_lockout_count: s.pinLockoutCount,
  };
}

/** Rate limit por IP usando la tabla rate_limits. */
export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc("rate_limit_hit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("[rate-limit]", error.message);
    return true; // no bloquear el servicio si falla el contador
  }
  return data === true;
}

// ---------------------------------------------------------------------------
// Inscripción
// ---------------------------------------------------------------------------
export async function registerCustomer(
  input: z.output<typeof registerSchema>,
  ip: string,
): Promise<ServiceResult> {
  if (!(await checkRateLimit(`register_ip:${ip}`, 10, 600))) {
    return { ok: false, error: "Demasiados intentos. Espera unos minutos.", status: 429 };
  }

  const { business, program } = await getBusinessBySlug(input.slug);
  if (!business || !program) return { ok: false, error: "Negocio no encontrado", status: 404 };
  if (business.status === "suspended") {
    return { ok: false, error: "Este negocio no está recibiendo inscripciones por ahora", status: 409 };
  }

  const phone = normalizePhone(input.phone, business.default_country);
  if (!phone) return { ok: false, error: "Teléfono inválido", field: "phone" };

  const admin = createAdminClient();
  const pinHash = await hash(input.pin, BCRYPT_COST);

  const { data: customer, error: customerError } = await admin
    .from("customers")
    .insert({
      business_id: business.id,
      full_name: input.fullName,
      phone_e164: phone,
      email: input.email || null,
      pin_hash: pinHash,
      marketing_consent: input.marketingConsent,
      privacy_accepted_at: new Date().toISOString(),
    })
    .select("id")
    .single<{ id: string }>();

  if (customerError) {
    if (customerError.code === "23505") {
      return { ok: false, code: "duplicate", error: "Ya tienes una tarjeta en este negocio", status: 409 };
    }
    console.error("[register] customer", customerError.message);
    return { ok: false, error: "No pudimos crear tu tarjeta, intenta de nuevo", status: 500 };
  }

  const { data: card, error: cardError } = await admin
    .from("cards")
    .insert({
      business_id: business.id,
      program_id: program.id,
      customer_id: customer.id,
      public_code: newPublicCode(),
      access_token: newAccessToken(),
    })
    .select("id, access_token")
    .single<{ id: string; access_token: string }>();

  if (cardError || !card) {
    console.error("[register] card", cardError?.message);
    await admin.from("customers").delete().eq("id", customer.id);
    return { ok: false, error: "No pudimos crear tu tarjeta, intenta de nuevo", status: 500 };
  }

  await setCustomerSession({ cardId: card.id, businessId: business.id });
  await writeAudit({
    businessId: business.id,
    actorId: null,
    action: "customer.register",
    entityType: "customer",
    entityId: customer.id,
    metadata: { card_id: card.id, marketing_consent: input.marketingConsent },
  });

  // Wallet no bloquea la inscripción.
  after(() => createCardEverywhere(card.id));

  return { ok: true, redirectTo: `/t/${card.access_token}` };
}

// ---------------------------------------------------------------------------
// Ingreso con teléfono + PIN
// ---------------------------------------------------------------------------
export async function loginCustomer(input: z.output<typeof loginSchema>, ip: string): Promise<ServiceResult> {
  if (!(await checkRateLimit(`login_ip:${ip}`, 20, 600))) {
    return { ok: false, error: "Demasiados intentos. Espera unos minutos.", status: 429 };
  }

  const { business } = await getBusinessBySlug(input.slug);
  if (!business) return { ok: false, error: "Negocio no encontrado", status: 404 };

  const phone = normalizePhone(input.phone, business.default_country);
  const admin = createAdminClient();

  const { data: customer } = phone
    ? await admin
        .from("customers")
        .select("*")
        .eq("business_id", business.id)
        .eq("phone_e164", phone)
        .is("deleted_at", null)
        .maybeSingle<Customer>()
    : { data: null };

  if (!customer) {
    await compare(input.pin, DUMMY_HASH);
    return { ok: false, error: GENERIC_LOGIN_ERROR, status: 401 };
  }

  const now = new Date();
  const state = lockState(customer);
  const status = getLockStatus(state, now);
  if (status.kind === "locked_permanently") {
    return { ok: false, code: "locked", error: "Por seguridad, contacta al negocio para restablecer tu PIN", status: 423 };
  }
  if (status.kind === "locked") {
    const minutes = Math.max(1, Math.ceil((status.until.getTime() - now.getTime()) / 60_000));
    return {
      ok: false,
      code: "locked",
      error: `Demasiados intentos. Intenta de nuevo en ${minutes} ${minutes === 1 ? "minuto" : "minutos"}.`,
      status: 423,
    };
  }

  const valid = await compare(input.pin, customer.pin_hash);
  if (!valid) {
    const next = registerFailedAttempt(state, now);
    await admin.from("customers").update(lockColumns(next)).eq("id", customer.id);
    if (next.pinLockedUntil && next.pinLockoutCount > state.pinLockoutCount) {
      return {
        ok: false,
        code: "locked",
        error:
          next.pinLockoutCount >= 3
            ? "Por seguridad, contacta al negocio para restablecer tu PIN"
            : "Demasiados intentos. Intenta de nuevo en 15 minutos.",
        status: 423,
      };
    }
    return { ok: false, error: GENERIC_LOGIN_ERROR, status: 401 };
  }

  if (customer.pin_must_change && customer.pin_temp_expires_at && new Date(customer.pin_temp_expires_at) < now) {
    return {
      ok: false,
      code: "temp_expired",
      error: "Tu PIN temporal venció. Pide al negocio que lo restablezca de nuevo.",
      status: 401,
    };
  }

  await admin.from("customers").update(lockColumns(registerSuccess(state))).eq("id", customer.id);

  if (customer.pin_must_change) {
    await setPinChangeTicket({ customerId: customer.id, businessId: business.id });
    return { ok: true, redirectTo: `/n/${business.slug}/nuevo-pin` };
  }

  const card = await activeCardFor(customer.id, business.id);
  if (!card) return { ok: false, error: "No encontramos tu tarjeta", status: 404 };

  await setCustomerSession({ cardId: card.id, businessId: business.id });
  return { ok: true, redirectTo: `/t/${card.access_token}` };
}

async function activeCardFor(customerId: string, businessId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("cards")
    .select("id, access_token, programs!inner(is_active)")
    .eq("customer_id", customerId)
    .eq("business_id", businessId)
    .eq("programs.is_active", true)
    .maybeSingle<{ id: string; access_token: string }>();
  return data;
}

// ---------------------------------------------------------------------------
// Cambio obligatorio de PIN (tras PIN temporal)
// ---------------------------------------------------------------------------
export async function changePinWithTicket(input: z.output<typeof changePinSchema>): Promise<ServiceResult> {
  const ticket = await getPinChangeTicket();
  if (!ticket) return { ok: false, error: "Tu sesión venció. Ingresa de nuevo con tu PIN temporal.", status: 401 };

  const admin = createAdminClient();
  const pinHash = await hash(input.pin, BCRYPT_COST);
  const { error } = await admin
    .from("customers")
    .update({ pin_hash: pinHash, pin_must_change: false, pin_temp_expires_at: null })
    .eq("id", ticket.customerId)
    .eq("business_id", ticket.businessId);
  if (error) return { ok: false, error: "No pudimos guardar tu PIN, intenta de nuevo", status: 500 };

  await clearPinChangeTicket();
  await writeAudit({
    businessId: ticket.businessId,
    actorId: null,
    action: "customer.pin_change",
    entityType: "customer",
    entityId: ticket.customerId,
  });

  const card = await activeCardFor(ticket.customerId, ticket.businessId);
  if (!card) return { ok: false, error: "No encontramos tu tarjeta", status: 404 };
  await setCustomerSession({ cardId: card.id, businessId: ticket.businessId });
  return { ok: true, redirectTo: `/t/${card.access_token}` };
}
