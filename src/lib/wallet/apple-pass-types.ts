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

/** Negocio al que se le asignó el identificador compartido (APPLE_PASS_TYPE_ID), si hay uno. */
export async function sharedPassTypeOwner(): Promise<string | null> {
  const config = appleConfig();
  if (!config) return null;
  return (await rowBy("pass_type_id", config.passTypeId))?.business_id ?? null;
}

/**
 * Identificador con el que se emiten hoy los pases nuevos del negocio. Un negocio
 * sin identificador propio usa el compartido solo si no es de otro negocio; si lo
 * es, devuelve null y Apple Wallet no se ofrece hasta configurar el suyo.
 */
export async function businessPassTypeId(businessId: string): Promise<string | null> {
  const config = appleConfig();
  if (!config) return null;
  const own = await rowBy("business_id", businessId);
  if (own) return own.pass_type_id;
  const owner = await sharedPassTypeOwner();
  return owner && owner !== businessId ? null : config.passTypeId;
}

/**
 * Firma para un identificador. `businessId` evita que un pase de un negocio se
 * firme con el identificador de otro. null si el identificador no corresponde.
 */
export async function signerFor(passTypeId: string, businessId: string): Promise<AppleSigner | null> {
  const config = appleConfig();
  if (!config) return null;
  const secret = passKeysSecret();
  // El certificado subido en el panel manda (también para el compartido, así se
  // renueva sin tocar las variables de Vercel).
  const row = secret ? await rowBy("pass_type_id", passTypeId) : null;
  if (row?.cert_pem && secret) {
    // El compartido también firma los pases anteriores de otros negocios.
    if (row.business_id !== businessId && passTypeId !== config.passTypeId) return null;
    return { passTypeId, signerCert: row.cert_pem, signerKey: decryptSecret(row.key_encrypted, secret) };
  }
  if (passTypeId !== config.passTypeId) return null;
  return {
    passTypeId,
    signerCert: config.signerCert,
    signerKey: config.signerKey,
    signerKeyPassphrase: config.signerKeyPassphrase,
  };
}

/** ¿Es un identificador que emitimos (el compartido o uno de negocio activo)? */
export async function isKnownPassType(passTypeId: string): Promise<boolean> {
  const config = appleConfig();
  if (!config) return false;
  if (passTypeId === config.passTypeId) return true;
  return passKeysSecret() ? (await rowBy("pass_type_id", passTypeId)) !== null : false;
}

/** Certificado y clave para conectarse a APNs con el topic de este identificador. */
export async function pushCredentials(
  passTypeId: string,
): Promise<{ cert: string; key: string; passphrase?: string } | null> {
  const config = appleConfig();
  if (!config) return null;
  const secret = passKeysSecret();
  const row = secret ? await rowBy("pass_type_id", passTypeId) : null;
  if (row?.cert_pem && secret) return { cert: row.cert_pem, key: decryptSecret(row.key_encrypted, secret) };
  if (passTypeId !== config.passTypeId) return null;
  return { cert: config.signerCert, key: config.signerKey, passphrase: config.signerKeyPassphrase };
}
