import "server-only";
import { appUrl } from "@/lib/env";
import { encodeCardQr } from "@/lib/domain/qr";
import { createAdminClient } from "@/lib/supabase/admin";
import { appleWallet } from "./apple";
import { googleWallet } from "./google";
import type { WalletCardData, WalletProgramData, WalletProvider } from "./types";

export const walletProviders: WalletProvider[] = [googleWallet, appleWallet];

function enabledProviders() {
  return walletProviders.filter((p) => p.isEnabled());
}

/**
 * Versión del dibujo de la imagen de sellos. Subirla cuando cambie el diseño de
 * /api/img/stamps para que Google descargue la imagen nueva (la cachea por URL).
 */
const STAMPS_IMAGE_RENDER = 2;

export function stampsImageUrl(programId: string, count: number, designVersion: number) {
  return appUrl(`/api/img/stamps/${programId}/${count}?v=${designVersion}-r${STAMPS_IMAGE_RENDER}`);
}

/** Google exige un logo: si el negocio no subió uno, se genera con su inicial. */
function logoOrFallback(logoUrl: string | null, programId: string) {
  return logoUrl ?? appUrl(`/api/img/logo/${programId}`);
}

interface CardRow {
  id: string;
  program_id: string;
  public_code: string;
  access_token: string;
  stamps_count: number;
  google_object_id: string | null;
  customers: { full_name: string };
  programs: {
    card_title: string;
    stamps_required: number;
    reward_description: string;
    design_version: number;
  };
  businesses: { name: string; logo_url: string | null; primary_color: string; text_color: string };
}

export async function loadWalletCardData(cardId: string): Promise<WalletCardData | null> {
  const { data } = await createAdminClient()
    .from("cards")
    .select(
      "id, program_id, public_code, access_token, stamps_count, google_object_id, customers(full_name), programs(card_title, stamps_required, reward_description, design_version), businesses(name, logo_url, primary_color, text_color)",
    )
    .eq("id", cardId)
    .maybeSingle<CardRow>();
  if (!data) return null;

  return {
    cardId: data.id,
    programId: data.program_id,
    businessName: data.businesses.name,
    cardTitle: data.programs.card_title,
    customerName: data.customers.full_name,
    publicCode: data.public_code,
    stampsCount: data.stamps_count,
    stampsRequired: data.programs.stamps_required,
    rewardDescription: data.programs.reward_description,
    rewardAvailable: data.stamps_count >= data.programs.stamps_required,
    qrValue: encodeCardQr(data.public_code),
    logoUrl: logoOrFallback(data.businesses.logo_url, data.program_id),
    primaryColor: data.businesses.primary_color,
    textColor: data.businesses.text_color,
    stampsImageUrl: stampsImageUrl(data.program_id, data.stamps_count, data.programs.design_version),
    webCardUrl: appUrl(`/t/${data.access_token}`),
    googleObjectId: data.google_object_id,
  };
}

export async function loadWalletProgramData(programId: string): Promise<WalletProgramData | null> {
  const { data } = await createAdminClient()
    .from("programs")
    .select("id, card_title, google_class_id, businesses(name, logo_url, primary_color)")
    .eq("id", programId)
    .maybeSingle<{
      id: string;
      card_title: string;
      google_class_id: string | null;
      businesses: { name: string; logo_url: string | null; primary_color: string };
    }>();
  if (!data) return null;
  return {
    programId: data.id,
    businessName: data.businesses.name,
    cardTitle: data.card_title,
    logoUrl: logoOrFallback(data.businesses.logo_url, data.id),
    primaryColor: data.businesses.primary_color,
    googleClassId: data.google_class_id,
  };
}

async function recordSync(cardId: string, error: string | null) {
  await createAdminClient()
    .from("cards")
    .update(error ? { wallet_sync_error: error.slice(0, 500) } : { wallet_sync_error: null, wallet_synced_at: new Date().toISOString() })
    .eq("id", cardId);
}

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

/** Mensaje de notificación solo en momentos clave (Google limita la cantidad). */
export function keyMomentMessage(before: number | null, data: WalletCardData): string | undefined {
  if (before !== null && data.stampsCount <= before) return undefined;
  if (data.rewardAvailable) return `¡Premio disponible! ${data.rewardDescription}`;
  if (data.stampsRequired - data.stampsCount === 1) return "¡Te falta 1 sello para tu premio!";
  return undefined;
}

/** Asegura la clase del programa en cada proveedor. No lanza errores. */
export async function ensureProgramEverywhere(programId: string): Promise<void> {
  const program = await loadWalletProgramData(programId);
  if (!program) return;
  for (const provider of enabledProviders()) {
    try {
      await provider.ensureProgram(program);
    } catch (err) {
      console.error(`[wallet:${provider.id}] ensureProgram`, programId, errorMessage(err));
    }
  }
}

/** Crea la tarjeta en cada proveedor (clase incluida). No lanza errores. */
export async function createCardEverywhere(cardId: string): Promise<void> {
  const data = await loadWalletCardData(cardId);
  if (!data) return;
  const providers = enabledProviders();
  if (providers.length === 0) return;
  await ensureProgramEverywhere(data.programId);
  let failure: string | null = null;
  for (const provider of providers) {
    try {
      await provider.createCard(data);
    } catch (err) {
      failure = `${provider.id}: ${errorMessage(err)}`;
      console.error(`[wallet:${provider.id}] createCard`, cardId, errorMessage(err));
    }
  }
  await recordSync(cardId, failure);
}

/**
 * Sincroniza la tarjeta en todos los proveedores habilitados. Nunca lanza: el
 * sello ya quedó guardado en la base de datos, que es la fuente de verdad.
 */
export async function syncCardEverywhere(cardId: string, opts: { stampsBefore?: number | null; message?: string } = {}) {
  try {
    const providers = enabledProviders();
    if (providers.length === 0) return;
    const data = await loadWalletCardData(cardId);
    if (!data) return;
    const message = opts.message ?? (opts.stampsBefore !== undefined ? keyMomentMessage(opts.stampsBefore, data) : undefined);

    let failure: string | null = null;
    for (const provider of providers) {
      try {
        await provider.syncCard(data, message);
      } catch (err) {
        failure = `${provider.id}: ${errorMessage(err)}`;
        console.error(`[wallet:${provider.id}] syncCard`, cardId, errorMessage(err));
      }
    }
    await recordSync(cardId, failure);
  } catch (err) {
    console.error("[wallet] syncCardEverywhere", cardId, errorMessage(err));
  }
}

/** Tras un cambio de diseño: sincroniza todas las tarjetas del programa por lotes. */
export async function syncProgramCards(programId: string, batchSize = 20): Promise<void> {
  if (enabledProviders().length === 0) return;
  await ensureProgramEverywhere(programId);
  const admin = createAdminClient();
  let from = 0;
  for (;;) {
    const { data } = await admin
      .from("cards")
      .select("id")
      .eq("program_id", programId)
      .not("google_object_id", "is", null)
      .order("created_at")
      .range(from, from + batchSize - 1);
    if (!data || data.length === 0) break;
    await Promise.all(data.map((c: { id: string }) => syncCardEverywhere(c.id)));
    if (data.length < batchSize) break;
    from += batchSize;
  }
}

export { googleWallet, appleWallet };
