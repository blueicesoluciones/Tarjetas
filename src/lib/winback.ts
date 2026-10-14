/** Texto por defecto del aviso «Te extrañamos». */
export function defaultWinbackMessage(businessName: string): string {
  return `¡Te extrañamos en ${businessName}! Vuelve pronto y suma tu próximo sello.`;
}

export const WINBACK_DAY_OPTIONS = [15, 30, 45, 60, 90] as const;

/** ¿Corresponde enviar el aviso? Inactivo hace ≥ días y sin aviso desde su última visita. */
export function needsWinback(card: { last_stamp_at: string; winback_sent_at: string | null }, days: number, now = new Date()) {
  const last = new Date(card.last_stamp_at).getTime();
  if (now.getTime() - last < days * 86_400_000) return false;
  return !card.winback_sent_at || new Date(card.winback_sent_at).getTime() < last;
}
