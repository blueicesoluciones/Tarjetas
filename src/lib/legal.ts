/**
 * Datos del operador de la plataforma usados en los textos legales.
 * Cuando la empresa esté registrada, agregar `taxId` (NIT) y `address` y
 * actualizar `updated` en las páginas /privacidad y /terminos.
 */
export const LEGAL = {
  company: "BlueIce Soluciones",
  email: "blueicesoluciones@gmail.com",
  /** WhatsApp de soporte prioritario (plan Pro), en formato +57… Pendiente de definir. */
  supportWhatsapp: null as string | null,
  country: "Colombia",
  taxId: null as string | null,
  address: null as string | null,
  updated: "1 de octubre de 2026",
} as const;
