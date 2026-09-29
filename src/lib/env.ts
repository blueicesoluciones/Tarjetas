import "server-only";
import { z } from "zod";

const serverEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  CUSTOMER_SESSION_SECRET: z.string().min(32, "CUSTOMER_SESSION_SECRET debe tener al menos 32 caracteres"),
  GOOGLE_WALLET_ISSUER_ID: z.string().optional(),
  GOOGLE_WALLET_SERVICE_ACCOUNT_JSON_BASE64: z.string().optional(),
  GOOGLE_WALLET_MODE: z.enum(["demo", "production"]).default("demo"),
  APPLE_WALLET_ENABLED: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

/** Variables de entorno del servidor, validadas una sola vez. */
export function serverEnv(): ServerEnv {
  if (!cached) {
    cached = serverEnvSchema.parse(process.env);
  }
  return cached;
}

export function appUrl(path = ""): string {
  const base = serverEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  return `${base}${path}`;
}
