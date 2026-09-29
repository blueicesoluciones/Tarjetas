import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { serverEnv } from "@/lib/env";

/** Sesión del cliente final: cookie firmada HS256, una por negocio (CLAUDE.md §7.3). */
const SESSION_DAYS = 180;

export interface CustomerSession {
  cardId: string;
  businessId: string;
}

function cookieName(businessId: string) {
  return `lc_c_${businessId.replace(/-/g, "")}`;
}

function secretKey() {
  return new TextEncoder().encode(serverEnv().CUSTOMER_SESSION_SECRET);
}

export async function setCustomerSession(session: CustomerSession): Promise<void> {
  const token = await new SignJWT({ card_id: session.cardId, business_id: session.businessId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());

  const store = await cookies();
  store.set(cookieName(session.businessId), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function getCustomerSession(businessId: string): Promise<CustomerSession | null> {
  const store = await cookies();
  const token = store.get(cookieName(businessId))?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (typeof payload.card_id !== "string" || payload.business_id !== businessId) return null;
    return { cardId: payload.card_id, businessId };
  } catch {
    return null;
  }
}

export async function clearCustomerSession(businessId: string): Promise<void> {
  const store = await cookies();
  store.delete(cookieName(businessId));
}
