import { z } from "zod";
import { PIN_ERROR_MESSAGES, validatePin } from "@/lib/domain/pin";

export const pinSchema = z.string().superRefine((pin, ctx) => {
  const err = validatePin(pin);
  if (err) ctx.addIssue({ code: "custom", message: PIN_ERROR_MESSAGES[err] });
});

export const registerSchema = z
  .object({
    slug: z.string().min(1),
    fullName: z.string().trim().min(2, "Ingresa tu nombre").max(80, "Nombre demasiado largo"),
    phone: z.string().trim().min(6, "Ingresa tu teléfono").max(25),
    email: z.union([z.literal(""), z.string().trim().email("Email inválido").max(120)]).optional(),
    pin: pinSchema,
    pinConfirm: z.string(),
    privacyAccepted: z.literal(true, { message: "Debes autorizar el tratamiento de tus datos para crear la tarjeta" }),
    marketingConsent: z.boolean().default(false),
  })
  .refine((d) => d.pin === d.pinConfirm, { message: "Los PIN no coinciden", path: ["pinConfirm"] });

export type RegisterInput = z.input<typeof registerSchema>;

export const loginSchema = z.object({
  slug: z.string().min(1),
  phone: z.string().trim().min(6, "Ingresa tu teléfono").max(25),
  pin: z.string().regex(/^\d{4}$/, "El PIN tiene 4 dígitos"),
});

export type LoginInput = z.input<typeof loginSchema>;

export const changePinSchema = z
  .object({ pin: pinSchema, pinConfirm: z.string() })
  .refine((d) => d.pin === d.pinConfirm, { message: "Los PIN no coinciden", path: ["pinConfirm"] });

export type ChangePinInput = z.input<typeof changePinSchema>;
