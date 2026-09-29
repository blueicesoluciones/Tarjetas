export interface WalletCardData {
  cardId: string;
  programId: string;
  businessName: string;
  cardTitle: string;
  customerName: string;
  publicCode: string;
  stampsCount: number;
  stampsRequired: number;
  rewardDescription: string;
  rewardAvailable: boolean;
  qrValue: string; // "LC1:<public_code>"
  logoUrl: string;
  primaryColor: string;
  textColor: string;
  stampsImageUrl: string; // imagen dinámica de sellos
  webCardUrl: string; // enlace a /t/[accessToken]
  googleObjectId: string | null;
}

export interface WalletProgramData {
  programId: string;
  businessName: string;
  cardTitle: string;
  logoUrl: string;
  primaryColor: string;
  googleClassId: string | null;
}

export interface WalletProvider {
  readonly id: "google" | "apple";
  isEnabled(): boolean;
  /** Crea/actualiza la clase del negocio. */
  ensureProgram(program: WalletProgramData): Promise<void>;
  /** Crea el objeto/pase. */
  createCard(data: WalletCardData): Promise<void>;
  /** Enlace del botón "Agregar". */
  getAddToWalletUrl(data: WalletCardData): Promise<string>;
  /** Actualiza tras un cambio. */
  syncCard(data: WalletCardData, message?: string): Promise<void>;
}

export class NotImplementedError extends Error {
  constructor(what: string) {
    super(`${what} no está implementado todavía`);
    this.name = "NotImplementedError";
  }
}
