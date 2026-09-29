import "server-only";
import { headers } from "next/headers";

/** IP del cliente detrás del proxy de Vercel. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export async function userAgent(): Promise<string> {
  return (await headers()).get("user-agent") ?? "";
}
