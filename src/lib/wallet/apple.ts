import "server-only";
import { NotImplementedError, type WalletProvider } from "./types";

/**
 * Apple Wallet — stub (CLAUDE.md §12). Se habilita con APPLE_WALLET_ENABLED=true
 * cuando exista la cuenta de Apple Developer.
 */
export const appleWallet: WalletProvider = {
  id: "apple",

  isEnabled() {
    return process.env.APPLE_WALLET_ENABLED === "true";
  },

  async ensureProgram() {
    // TODO(apple): no hay "clase" en Apple; el diseño va dentro de cada pase.
    // Nada que hacer aquí salvo validar certificados al habilitar.
  },

  async createCard() {
    // TODO(apple): asignar cards.apple_serial_number (uuid) y cards.apple_auth_token
    // (≥16 chars aleatorio) si faltan. El .pkpass se genera bajo demanda en
    // GET /api/apple/pass/[accessToken] con passkit-generator (storeCard, strip =
    // imagen de sellos, barcodes QR LC1:<public_code>, webServiceURL /api/apple).
    throw new NotImplementedError("Apple Wallet createCard");
  },

  async getAddToWalletUrl() {
    // TODO(apple): devolver `${APP_URL}/api/apple/pass/${accessToken}`.
    throw new NotImplementedError("Apple Wallet getAddToWalletUrl");
  },

  async syncCard() {
    // TODO(apple): cards.updated_at ya cambia con cada sello (trigger). Enviar push
    // APNs vacío ({}) por HTTP/2 a cada push_token de apple_device_registrations
    // con topic = APPLE_PASS_TYPE_ID y JWT firmado con la clave .p8 (runtime Node).
    throw new NotImplementedError("Apple Wallet syncCard");
  },
};
