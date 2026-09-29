import { z } from "zod";

const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color inválido (usa #RRGGBB)");

export const businessFieldsSchema = z.object({
  name: z.string().trim().min(1, "Ingresa el nombre").max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "El slug debe tener al menos 2 caracteres")
    .max(60)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Solo minúsculas, números y guiones (ej. cafe-luna)"),
  primary_color: hex,
  text_color: hex,
  default_country: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "Código de país ISO de 2 letras"),
  timezone: z.string().trim().min(1).max(60),
  contact_whatsapp: z
    .string()
    .trim()
    .max(25)
    .transform((v) => (v === "" ? null : v)),
  status: z.enum(["trial", "active", "suspended"]),
});

export const programFieldsSchema = z.object({
  card_title: z.string().trim().min(1, "Ingresa el título de la tarjeta").max(80),
  stamps_required: z.coerce.number().int().min(2, "Mínimo 2 sellos").max(30, "Máximo 30 sellos"),
  reward_description: z.string().trim().min(1, "Describe el premio").max(200),
  stamp_cooldown_minutes: z.coerce.number().int().min(0).max(10080),
  undo_window_minutes: z.coerce.number().int().min(0).max(1440),
});

export const ownerFieldsSchema = z.object({
  owner_name: z.string().trim().min(2, "Ingresa el nombre del dueño").max(80),
  owner_email: z.string().trim().toLowerCase().email("Email del dueño inválido"),
});

export const createBusinessSchema = businessFieldsSchema.extend({
  status: z.enum(["trial", "active"]),
  ...programFieldsSchema.shape,
  ...ownerFieldsSchema.shape,
});

export function slugify(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
