/** Formato del QR de la tarjeta: `LC1:<public_code>` (CLAUDE.md §9). */
const QR_PREFIX = "LC1:";
const PUBLIC_CODE_RE = /^[A-Za-z0-9_-]{12,64}$/;

export function encodeCardQr(publicCode: string): string {
  return `${QR_PREFIX}${publicCode}`;
}

/** Devuelve el public_code o null si el QR no es una tarjeta válida. */
export function parseCardQr(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith(QR_PREFIX)) return null;
  const code = trimmed.slice(QR_PREFIX.length);
  return PUBLIC_CODE_RE.test(code) ? code : null;
}

export const INVALID_QR_MESSAGE = "Este código no es una tarjeta válida";
