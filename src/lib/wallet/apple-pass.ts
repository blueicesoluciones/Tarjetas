import "server-only";
import { randomUUID } from "node:crypto";
import { PKPass } from "passkit-generator";
import sharp from "sharp";
import { nanoid } from "nanoid";
import { appUrl } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { appleConfig } from "./apple-config";
import { loadWalletCardData } from "./index";
import type { WalletCardData } from "./types";

export interface AppleCardRef {
  id: string;
  serialNumber: string;
  authToken: string;
  updatedAt: string;
}

/** Asigna serial y token de Apple a la tarjeta la primera vez que se descarga el pase. */
export async function ensureAppleIdentity(cardId: string): Promise<AppleCardRef | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("cards")
    .select("id, apple_serial_number, apple_auth_token, updated_at")
    .eq("id", cardId)
    .maybeSingle<{ id: string; apple_serial_number: string | null; apple_auth_token: string | null; updated_at: string }>();
  if (!data) return null;
  if (data.apple_serial_number && data.apple_auth_token) {
    return { id: data.id, serialNumber: data.apple_serial_number, authToken: data.apple_auth_token, updatedAt: data.updated_at };
  }
  const { data: updated } = await admin
    .from("cards")
    .update({ apple_serial_number: data.apple_serial_number ?? randomUUID(), apple_auth_token: data.apple_auth_token ?? nanoid(32) })
    .eq("id", cardId)
    .select("id, apple_serial_number, apple_auth_token, updated_at")
    .single<{ id: string; apple_serial_number: string; apple_auth_token: string; updated_at: string }>();
  if (!updated) return null;
  return { id: updated.id, serialNumber: updated.apple_serial_number, authToken: updated.apple_auth_token, updatedAt: updated.updated_at };
}

/** Tarjeta por serial de Apple, validando el token del encabezado `ApplePass`. */
export async function findAppleCard(serialNumber: string, authHeader: string | null): Promise<AppleCardRef | null> {
  const token = authHeader?.match(/^ApplePass (.+)$/)?.[1];
  if (!token) return null;
  const { data } = await createAdminClient()
    .from("cards")
    .select("id, apple_serial_number, apple_auth_token, updated_at, customers(deleted_at)")
    .eq("apple_serial_number", serialNumber)
    .maybeSingle<{
      id: string;
      apple_serial_number: string;
      apple_auth_token: string;
      updated_at: string;
      customers: { deleted_at: string | null };
    }>();
  if (!data || data.apple_auth_token !== token || data.customers.deleted_at) return null;
  return { id: data.id, serialNumber: data.apple_serial_number, authToken: data.apple_auth_token, updatedAt: data.updated_at };
}

function rgb(hex: string) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return "rgb(0, 0, 0)";
  return `rgb(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)})`;
}

async function fetchImage(url: string): Promise<Buffer> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`No se pudo descargar ${url}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Imágenes del pase (Apple solo acepta PNG) en @1x, @2x y @3x. */
async function passImages(data: WalletCardData): Promise<Record<string, Buffer>> {
  const [logo, strip] = await Promise.all([fetchImage(data.logoUrl), fetchImage(data.stampsImageUrl)]);
  const out: Record<string, Buffer> = {};
  const scales = [
    ["", 1],
    ["@2x", 2],
    ["@3x", 3],
  ] as const;
  for (const [suffix, s] of scales) {
    out[`logo${suffix}.png`] = await sharp(logo).resize({ width: 160 * s, height: 50 * s, fit: "inside" }).png().toBuffer();
    out[`icon${suffix}.png`] = await sharp(logo)
      .resize({ width: 29 * s, height: 29 * s, fit: "contain", background: data.primaryColor })
      .flatten({ background: data.primaryColor })
      .png()
      .toBuffer();
    out[`strip${suffix}.png`] = await sharp(strip).resize({ width: 375 * s, height: 123 * s, fit: "cover" }).png().toBuffer();
  }
  return out;
}

/**
 * Estado del pase con aviso en pantalla de bloqueo (changeMessage). Solo cambia
 * en momentos clave para no notificar en cada sello.
 */
export function appleStatusLine(data: WalletCardData): string {
  if (data.rewardAvailable) return `¡Premio disponible! ${data.rewardDescription}`;
  const pending = data.milestones.find((m) => m.available);
  if (pending) return `¡Ganaste un premio! ${pending.description}`;
  if (data.stampsRequired - data.stampsCount === 1) return "¡Te falta 1 sello para tu premio!";
  return "Muestra este código en caja para sumar sellos";
}

/** Genera el .pkpass firmado de una tarjeta. */
export async function buildApplePass(cardId: string): Promise<{ buffer: Buffer; ref: AppleCardRef } | null> {
  const config = appleConfig();
  if (!config) return null;
  const ref = await ensureAppleIdentity(cardId);
  const data = await loadWalletCardData(cardId);
  if (!ref || !data) return null;

  const pass = new PKPass(
    await passImages(data),
    {
      wwdr: config.wwdr,
      signerCert: config.signerCert,
      signerKey: config.signerKey,
      signerKeyPassphrase: config.signerKeyPassphrase,
    },
    {
      formatVersion: 1,
      passTypeIdentifier: config.passTypeId,
      teamIdentifier: config.teamId,
      serialNumber: ref.serialNumber,
      authenticationToken: ref.authToken,
      webServiceURL: appUrl("/api/apple"),
      organizationName: data.businessName,
      description: data.cardTitle,
      logoText: data.businessName,
      backgroundColor: rgb(data.primaryColor),
      foregroundColor: rgb(data.textColor),
      labelColor: rgb(data.textColor),
      sharingProhibited: true,
    },
  );
  pass.type = "storeCard";

  pass.headerFields.push({
    key: "stamps",
    label: "SELLOS",
    value: `${data.stampsCount}/${data.stampsRequired}`,
  });
  pass.secondaryFields.push({ key: "customer", label: "CLIENTE", value: data.customerName });
  pass.auxiliaryFields.push({ key: "status", label: "", value: appleStatusLine(data), changeMessage: "%@" });

  const rewards = [
    ...data.milestones.map(
      (m) => `${m.stampsAt} sellos: ${m.description}${m.available ? " (disponible)" : m.claimed ? " (cobrado)" : ""}`,
    ),
    `${data.stampsRequired} sellos: ${data.rewardDescription}${data.rewardAvailable ? " (disponible)" : ""}`,
  ];
  // Avisos del negocio: al cambiar el texto, el iPhone lo muestra en la pantalla de bloqueo.
  // Siempre presente: Apple solo avisa cuando cambia el valor de un campo que ya existía.
  pass.backFields.push({
    key: "news",
    label: "Novedades",
    value: data.appleMessage ?? `Aquí verás las novedades de ${data.businessName}.`,
    changeMessage: "%@",
  });
  pass.backFields.push(
    { key: "rewards", label: "Premios", value: rewards.join("\n") },
    { key: "web", label: "Tu tarjeta web", value: data.webCardUrl },
    { key: "code", label: "Código", value: data.publicCode },
    { key: "about", label: "Funciona con stamp", value: "Pide a tu cajero que escanee el código para sumar sellos." },
  );

  pass.setBarcodes({ format: "PKBarcodeFormatQR", message: data.qrValue, messageEncoding: "iso-8859-1", altText: data.publicCode });

  return { buffer: pass.getAsBuffer(), ref };
}
