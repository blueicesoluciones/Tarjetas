import "server-only";
import http2 from "node:http2";
import { createAdminClient } from "@/lib/supabase/admin";
import { appleConfig } from "./apple-config";
import { pushCredentials } from "./apple-pass-types";

const APNS_HOST = "https://api.push.apple.com";

function send(session: http2.ClientHttp2Session, pushToken: string, topic: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = session.request({
      ":method": "POST",
      ":path": `/3/device/${pushToken}`,
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
      if (status >= 400 && status !== 410) console.error("[apns]", topic, status, body);
      resolve(status);
    });
    req.on("error", reject);
    req.end("{}");
  });
}

interface Registration {
  id: string;
  push_token: string;
  pass_type_identifier: string;
}

/**
 * Avisa a los iPhone que tienen el pase que hay una versión nueva (push vacío).
 * El dispositivo luego pide el pase actualizado al Web Service. Una tarjeta puede
 * estar guardada con el identificador compartido y con el propio del negocio:
 * cada registro se avisa con su identificador como topic.
 *
 * La conexión se autentica con el certificado de cada Pass Type ID (como indica
 * Apple para Wallet). La clave .p8 no sirve: APNs la rechaza con TopicDisallowed
 * para los identificadores de los negocios.
 */
export async function pushPassUpdate(serialNumber: string): Promise<void> {
  if (!appleConfig()) return;
  const admin = createAdminClient();
  const { data: regs } = await admin
    .from("apple_device_registrations")
    .select("id, push_token, pass_type_identifier")
    .eq("serial_number", serialNumber)
    .returns<Registration[]>();
  if (!regs || regs.length === 0) return;

  const byType = new Map<string, Registration[]>();
  for (const r of regs) byType.set(r.pass_type_identifier, [...(byType.get(r.pass_type_identifier) ?? []), r]);

  const gone: string[] = [];
  let failed = 0;
  for (const [passTypeId, group] of byType) {
    const creds = await pushCredentials(passTypeId);
    if (!creds) {
      console.error("[apns] sin certificado para", passTypeId);
      failed += group.length;
      continue;
    }
    const session = http2.connect(APNS_HOST, creds);
    try {
      session.on("error", (err) => console.error("[apns] sesión", passTypeId, err.message));
      const results = await Promise.allSettled(group.map((r) => send(session, r.push_token, passTypeId)));
      results.forEach((res, i) => {
        // 410: el dispositivo ya no tiene el pase.
        if (res.status === "fulfilled" && res.value === 410) gone.push(group[i].id);
        else if (res.status === "rejected" || res.value >= 400) failed++;
      });
    } finally {
      session.close();
    }
  }
  if (gone.length > 0) await admin.from("apple_device_registrations").delete().in("id", gone);
  if (failed > 0) throw new Error(`APNs: ${failed} de ${regs.length} avisos fallaron`);
}
