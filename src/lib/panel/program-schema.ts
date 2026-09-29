import { z } from "zod";

const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color inválido (usa formato #RRGGBB)");

function validTimeZone(tz: string) {
  try {
    new Intl.DateTimeFormat("es", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const programFormSchema = z.object({
  cardTitle: z.string().trim().min(1, "Ingresa el título").max(80),
  stampsRequired: z.coerce.number().int().min(2, "Mínimo 2 sellos").max(30, "Máximo 30 sellos"),
  rewardDescription: z.string().trim().min(1, "Describe el premio").max(200),
  stampCooldownMinutes: z.coerce.number().int().min(0).max(10080, "Máximo 7 días"),
  undoWindowMinutes: z.coerce.number().int().min(0).max(1440),
  businessName: z.string().trim().min(1, "Ingresa el nombre").max(120),
  primaryColor: hex,
  textColor: hex,
  contactWhatsapp: z.string().trim().max(25).optional().default(""),
  defaultCountry: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "Código de país de 2 letras"),
  timezone: z.string().trim().refine(validTimeZone, "Zona horaria inválida"),
});

export type ProgramFormValues = z.output<typeof programFormSchema>;

export const COMMON_TIMEZONES = [
  "America/Santiago",
  "America/Bogota",
  "America/Lima",
  "America/Mexico_City",
  "America/Argentina/Buenos_Aires",
  "America/Montevideo",
  "America/Asuncion",
  "America/La_Paz",
  "America/Guayaquil",
  "America/Caracas",
  "America/Panama",
  "America/Costa_Rica",
  "America/Guatemala",
  "America/Santo_Domingo",
  "America/Sao_Paulo",
  "Europe/Madrid",
];

export const COMMON_COUNTRIES: Array<[string, string]> = [
  ["CL", "Chile"],
  ["CO", "Colombia"],
  ["PE", "Perú"],
  ["MX", "México"],
  ["AR", "Argentina"],
  ["UY", "Uruguay"],
  ["PY", "Paraguay"],
  ["BO", "Bolivia"],
  ["EC", "Ecuador"],
  ["VE", "Venezuela"],
  ["PA", "Panamá"],
  ["CR", "Costa Rica"],
  ["GT", "Guatemala"],
  ["DO", "República Dominicana"],
  ["BR", "Brasil"],
  ["ES", "España"],
  ["US", "Estados Unidos"],
];
