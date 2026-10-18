import type { MilestoneStatus } from "@/lib/rewards";

export interface WalletCardData {
  cardId: string;
  businessId: string;
  programId: string;
  businessName: string;
  cardTitle: string;
  customerName: string;
  publicCode: string;
  stampsCount: number;
  stampsRequired: number;
  rewardDescription: string;
  rewardAvailable: boolean;
  /** Premios intermedios del ciclo actual (vacío si el plan no los incluye). */
  milestones: MilestoneStatus[];
  qrValue: string; // "LC1:<public_code>"
  logoUrl: string;
  primaryColor: string;
  textColor: string;
  stampsImageUrl: string; // imagen dinámica de sellos
  webCardUrl: string; // enlace a /t/[accessToken]
  googleObjectId: string | null;
  /** Serial del pase de Apple (null si nunca se agregó a Apple Wallet). */
  appleSerialNumber: string | null;
  /** Último aviso (campaña o «Te extrañamos») para el pase de Apple. */
  appleMessage: string | null;
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
