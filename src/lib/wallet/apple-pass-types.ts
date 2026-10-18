import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { appleConfig } from "./apple-config";
import { decryptSecret } from "./apple-certs";

/**
 * Pass Type ID de cada negocio. Mientras un negocio no tenga certificado propio,
 * sus pases salen con el identificador compartido (APPLE_PASS_TYPE_ID).
 */

export interface AppleSigner {
  passTypeId: string;
  signerCert: string;
  signerKey: string;
  signerKeyPassphrase?: string;
}

interface Row {
  business_id: string;
  pass_type_id: string;
  key_encrypted: string;
  cert_pem: string | null;
}

export function passKeysSecret(): string | null {
  return process.env.APPLE_PASS_KEYS_SECRET || null;
}

const cache = new Map<string, { at: number; row: Row | null }>();
const TTL = 60_000;

async function rowBy(column: "business_id" | "pass_type_id", value: string): Promise<Row | null> {
  const key = `${column}:${value}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.row;
  const { data } = await createAdminClient()
    .from("business_apple_pass_types")
    .select("business_id, pass_type_id, key_encrypted, cert_pem")
    .eq(column, value)
    .not("cert_pem", "is", null)
    .maybeSingle<Row>();
  cache.set(key, { at: Date.now(), row: data ?? null });
  return data ?? null;
}

export function clearPassTypeCache() {
  cache.clear();
}

/** Identificador con el que se emiten hoy los pases del negocio. */
export async function businessPassTypeId(businessId: string): Promise<string | null> {
  const config = appleConfig();
  if (!config) return null;
  const own = passKeysSecret() ? await rowBy("business_id", businessId) : null;
  return own?.pass_type_id ?? config.passTypeId;
}

/** Identificador propio y activo del negocio (null si usa el compartido). */
export async function ownPassTypeId(businessId: string): Promise<string | null> {
  if (!appleConfig() || !passKeysSecret()) return null;
  return (await rowBy("business_id", businessId))?.pass_type_id ?? null;
}

/**
 * Firma para un identificador. `businessId` evita que un pase de un negocio se
 * firme con el identificador de otro. null si el identificador no corresponde.
 */
export async function signerFor(passTypeId: string, businessId: string): Promise<AppleSigner | null> {
  const config = appleConfig();
  if (!config) return null;
  if (passTypeId === config.passTypeId) {
    return {
      passTypeId,
      signerCert: config.signerCert,
      signerKey: config.signerKey,
      signerKeyPassphrase: config.signerKeyPassphrase,
    };
  }
  const secret = passKeysSecret();
  if (!secret) return null;
  const row = await rowBy("pass_type_id", passTypeId);
  if (!row?.cert_pem || row.business_id !== businessId) return null;
  return { passTypeId, signerCert: row.cert_pem, signerKey: decryptSecret(row.key_encrypted, secret) };
}

/** ¿Es un identificador que emitimos (el compartido o uno de negocio activo)? */
export async function isKnownPassType(passTypeId: string): Promise<boolean> {
  const config = appleConfig();
  if (!config) return false;
  if (passTypeId === config.passTypeId) return true;
  return passKeysSecret() ? (await rowBy("pass_type_id", passTypeId)) !== null : false;
}
