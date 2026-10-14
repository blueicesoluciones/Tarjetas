import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { appleConfig } from "./apple-config";
import { pushPassUpdate } from "./apns";
import type { WalletProvider } from "./types";

/**
 * Apple Wallet (CLAUDE.md §12). El .pkpass se genera bajo demanda en
 * GET /api/apple/pass/[accessToken] y en el Web Service (/api/apple/v1/...);
 * aquí solo se avisa a los dispositivos registrados cuando la tarjeta cambia.
 */
export const appleWallet: WalletProvider = {
  id: "apple",

  isEnabled() {
    return appleConfig() !== null;
  },

  async ensureProgram() {
    // Apple no tiene "clase": el diseño va dentro de cada pase.
  },

  async createCard() {
    // El serial y el token se asignan al descargar el pase por primera vez.
  },

  async getAddToWalletUrl(data) {
    const accessToken = data.webCardUrl.split("/t/")[1];
    return data.webCardUrl.replace(`/t/${accessToken}`, `/api/apple/pass/${accessToken}`);
  },

  async syncCard(data) {
    if (!data.appleSerialNumber) return;
    // El iPhone pregunta qué pases cambiaron desde su última marca (cards.updated_at).
    // Un cambio de diseño no toca la tarjeta, así que se marca aquí antes del aviso.
    await createAdminClient().from("cards").update({ updated_at: new Date().toISOString() }).eq("id", data.cardId);
    await pushPassUpdate(data.appleSerialNumber);
  },
};
