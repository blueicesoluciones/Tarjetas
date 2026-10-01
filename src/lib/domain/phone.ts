import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

/**
 * Normaliza un teléfono a E.164 usando el país por defecto del negocio.
 * Devuelve null si el número no es válido.
 */
export function normalizePhone(input: string, defaultCountry: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const parsed = parsePhoneNumberFromString(trimmed, defaultCountry as CountryCode);
  if (parsed?.isValid()) return parsed.number;
  // Número con indicativo pero sin "+" (ej. 57 311 655 4177).
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length > 10) {
    const withPlus = parsePhoneNumberFromString(`+${digits}`);
    if (withPlus?.isValid()) return withPlus.number;
  }
  return null;
}

/** Formato legible para mostrar (ej. +57 311 655 4177). */
export function formatPhone(e164: string): string {
  const parsed = parsePhoneNumberFromString(e164);
  return parsed ? parsed.formatInternational() : e164;
}

/** Ayuda para el campo de celular según el país del negocio. */
export function phoneFieldHint(country: string): { placeholder: string; hint: string; invalid: string } {
  if (country === "CO") {
    return {
      placeholder: "311 655 4177",
      hint: "Tu celular de 10 dígitos. No hace falta el +57.",
      invalid: "Escribe tu celular de 10 dígitos, por ejemplo 311 655 4177",
    };
  }
  return { placeholder: "", hint: "", invalid: "Teléfono inválido" };
}
