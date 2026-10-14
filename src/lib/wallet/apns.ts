import "server-only";
import http2 from "node:http2";
import { importPKCS8, SignJWT } from "jose";
import { createAdminClient } from "@/lib/supabase/admin";
import { appleConfig } from "./apple-config";

const APNS_HOST = "https://api.push.apple.com";

let token: { value: string; at: number } | null = null;

/** JWT de proveedor para APNs (ES256 con la clave .p8). Apple pide renovarlo cada < 60 min. */
async function providerToken(): Promise<string> {
  const config = appleConfig();
  if (!config) throw new Error("Apple Wallet sin configurar");
  if (token && Date.now() - token.at < 45 * 60_000) return token.value;
  const key = await importPKCS8(config.apnsKey, "ES256");
  const value = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: config.apnsKeyId })
    .setIssuer(config.teamId)
    .setIssuedAt()
    .sign(key);
  token = { value, at: Date.now() };
  return value;
}

function send(session: http2.ClientHttp2Session, pushToken: string, jwt: string, topic: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = session.request({
      ":method": "POST",
      ":path": `/3/device/${pushToken}`,
      authorization: `bearer ${jwt}`,
      "apns-topic": topic,
      "content-type": "application/json",
    });
    req.setEncoding("utf8");
    let status = 0;
    let body = "";
    req.on("response", (headers) => {
      status = Number(headers[":status"]);
    });
    req.on("data", (chunk: string) => (body += chunk));
    req.on("end", () => {
      if (status >= 400 && status !== 410) console.error("[apns]", status, body);
      resolve(status);
    });
    req.on("error", reject);
    req.end("{}");
  });
}

/**
 * Avisa a los iPhone que tienen el pase que hay una versión nueva (push vacío).
 * El dispositivo luego pide el pase actualizado al Web Service.
 */
export async function pushPassUpdate(serialNumber: string): Promise<void> {
  const config = appleConfig();
  if (!config) return;
  const admin = createAdminClient();
  const { data: regs } = await admin
    .from("apple_device_registrations")
    .select("id, push_token")
    .eq("pass_type_identifier", config.passTypeId)
    .eq("serial_number", serialNumber)
    .returns<{ id: string; push_token: string }[]>();
  if (!regs || regs.length === 0) return;

  const jwt = await providerToken();
  const session = http2.connect(APNS_HOST);
  try {
    session.on("error", (err) => console.error("[apns] sesión", err.message));
    const results = await Promise.allSettled(regs.map((r) => send(session, r.push_token, jwt, config.passTypeId)));
    // 410: el dispositivo ya no tiene el pase.
    const gone = regs.filter((_, i) => {
      const r = results[i];
      return r.status === "fulfilled" && r.value === 410;
    });
    if (gone.length > 0) await admin.from("apple_device_registrations").delete().in("id", gone.map((g) => g.id));
    const failed = results.filter((r) => r.status === "rejected" || (r.value >= 400 && r.value !== 410));
    if (failed.length > 0) throw new Error(`APNs: ${failed.length} de ${regs.length} avisos fallaron`);
  } finally {
    session.close();
  }
}
