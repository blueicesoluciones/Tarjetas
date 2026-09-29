import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

/**
 * Normaliza un teléfono a E.164 usando el país por defecto del negocio.
 * Devuelve null si el número no es válido.
 */
export function normalizePhone(input: string, defaultCountry: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const parsed = parsePhoneNumberFromString(trimmed, defaultCountry as CountryCode);
  if (!parsed || !parsed.isValid()) return null;
  return parsed.number;
}

/** Formato legible para mostrar (ej. +56 9 1234 5601). */
export function formatPhone(e164: string): string {
  const parsed = parsePhoneNumberFromString(e164);
  return parsed ? parsed.formatInternational() : e164;
}
