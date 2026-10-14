import "server-only";

/** Credenciales de Apple Wallet desde variables de entorno (PEM y .p8 en base64). */
export interface AppleConfig {
  passTypeId: string;
  teamId: string;
  signerCert: string;
  signerKey: string;
  signerKeyPassphrase?: string;
  wwdr: string;
  apnsKeyId: string;
  apnsKey: string;
}

const decode = (v: string | undefined) => (v ? Buffer.from(v, "base64").toString("utf8") : "");

let cached: AppleConfig | null | undefined;

/** null si Apple Wallet no está habilitado o le falta alguna credencial. */
export function appleConfig(): AppleConfig | null {
  if (cached !== undefined) return cached;
  const e = process.env;
  if (e.APPLE_WALLET_ENABLED !== "true") return (cached = null);
  const config: AppleConfig = {
    passTypeId: e.APPLE_PASS_TYPE_ID ?? "",
    teamId: e.APPLE_TEAM_ID ?? "",
    signerCert: decode(e.APPLE_PASS_CERT_PEM_BASE64),
    signerKey: decode(e.APPLE_PASS_KEY_PEM_BASE64),
    signerKeyPassphrase: e.APPLE_PASS_KEY_PASSPHRASE || undefined,
    wwdr: decode(e.APPLE_WWDR_CERT_PEM_BASE64),
    apnsKeyId: e.APPLE_APNS_KEY_ID ?? "",
    apnsKey: decode(e.APPLE_APNS_KEY_P8_BASE64),
  };
  const missing = Object.entries(config)
    .filter(([k, v]) => k !== "signerKeyPassphrase" && !v)
    .map(([k]) => k);
  if (missing.length > 0) {
    console.error("[wallet:apple] faltan credenciales:", missing.join(", "));
    return (cached = null);
  }
  return (cached = config);
}
