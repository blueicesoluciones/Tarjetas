"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { writeAudit } from "@/lib/audit";
import { getStaffContext } from "@/lib/auth/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncCardEverywhere } from "@/lib/wallet";
import { appleConfig } from "@/lib/wallet/apple-config";
import {
  PASS_TYPE_ID_RE,
  certMatchesKey,
  decryptSecret,
  encryptSecret,
  generateKeyAndCsr,
  parsePassCertificate,
} from "@/lib/wallet/apple-certs";
import { clearPassTypeCache, passKeysSecret } from "@/lib/wallet/apple-pass-types";

export interface ApplePassState {
  error?: string;
  success?: string;
}

async function requireSuperAdmin() {
  const ctx = await getStaffContext();
  if (!ctx || ctx.profile.role !== "super_admin") redirect("/login");
  return ctx;
}

interface PassTypeRow {
  pass_type_id: string;
  key_encrypted: string;
  cert_pem: string | null;
}

function setupError(): string | null {
  if (!appleConfig()) return "Apple Wallet no está activo en el servidor.";
  if (!passKeysSecret()) return "Falta la variable APPLE_PASS_KEYS_SECRET en el servidor.";
  return null;
}

/** Paso 1: guarda el identificador y genera la clave y la solicitud (CSR) para Apple. */
export async function prepareApplePassType(
  businessId: string,
  _prev: ApplePassState,
  formData: FormData,
): Promise<ApplePassState> {
  const ctx = await requireSuperAdmin();
  const id = z.guid().parse(businessId);
  const problem = setupError();
  if (problem) return { error: problem };
  const passTypeId = String(formData.get("passTypeId") ?? "").trim();
  if (!PASS_TYPE_ID_RE.test(passTypeId) || passTypeId.length > 120) {
    return { error: "El identificador debe verse así: pass.com.blueicesoluciones.nombre-del-negocio" };
  }
  if (passTypeId === appleConfig()?.passTypeId)
    return { error: "Ese es el identificador compartido. Usa uno propio del negocio." };

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("business_apple_pass_types")
    .select("pass_type_id, key_encrypted, cert_pem")
    .eq("business_id", id)
    .maybeSingle<PassTypeRow>();
  if (existing?.cert_pem)
    return { error: "Este negocio ya tiene su identificador activo; no se puede cambiar." };

  const { keyPem, csrPem } = generateKeyAndCsr(passTypeId);
  const { error } = await admin.from("business_apple_pass_types").upsert({
    business_id: id,
    pass_type_id: passTypeId,
    key_encrypted: encryptSecret(keyPem, passKeysSecret()!),
    csr_pem: csrPem,
    cert_pem: null,
    cert_expires_at: null,
  });
  if (error) {
    if (error.code === "23505") return { error: "Ese identificador ya lo usa otro negocio." };
    return { error: `No se pudo guardar: ${error.message}` };
  }
  await writeAudit({
    businessId: id,
    actorId: ctx.userId,
    action: "apple.pass_type.prepare",
    entityType: "business",
    entityId: id,
    metadata: { pass_type_id: passTypeId },
  });
  revalidatePath(`/admin/negocios/${id}`);
  return { success: "Listo. Descarga la solicitud y sigue los pasos en Apple." };
}

/** Paso 2: sube el certificado que entregó Apple. También sirve para renovarlo. */
export async function uploadApplePassCert(
  businessId: string,
  _prev: ApplePassState,
  formData: FormData,
): Promise<ApplePassState> {
  const ctx = await requireSuperAdmin();
  const id = z.guid().parse(businessId);
  const problem = setupError();
  if (problem) return { error: problem };
  const file = formData.get("certificate");
  if (!(file instanceof File) || file.size === 0)
    return { error: "Elige el archivo .cer que descargaste de Apple." };
  if (file.size > 20_000) return { error: "Ese archivo es demasiado grande para ser un certificado." };

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("business_apple_pass_types")
    .select("pass_type_id, key_encrypted, cert_pem")
    .eq("business_id", id)
    .maybeSingle<PassTypeRow>();
  if (!row) return { error: "Primero genera la solicitud (paso 1)." };

  let parsed;
  try {
    parsed = parsePassCertificate(Buffer.from(await file.arrayBuffer()));
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Certificado inválido" };
  }
  if (parsed.passTypeId !== row.pass_type_id) {
    return {
      error: `Ese certificado es de ${parsed.passTypeId}, pero este negocio usa ${row.pass_type_id}.`,
    };
  }
  if (parsed.teamId !== appleConfig()!.teamId)
    return { error: "Ese certificado es de otra cuenta de Apple Developer." };
  if (parsed.expiresAt <= new Date()) return { error: "Ese certificado ya venció. Crea uno nuevo en Apple." };
  if (!certMatchesKey(parsed.certPem, decryptSecret(row.key_encrypted, passKeysSecret()!))) {
    return {
      error:
        "Ese certificado no se creó con la solicitud de este negocio. Sube a Apple la solicitud descargada aquí.",
    };
  }

  const firstTime = !row.cert_pem;
  const { error } = await admin
    .from("business_apple_pass_types")
    .update({ cert_pem: parsed.certPem, cert_expires_at: parsed.expiresAt.toISOString() })
    .eq("business_id", id);
  if (error) return { error: `No se pudo guardar: ${error.message}` };
  clearPassTypeCache();

  await writeAudit({
    businessId: id,
    actorId: ctx.userId,
    action: firstTime ? "apple.pass_type.activate" : "apple.pass_type.renew",
    entityType: "business",
    entityId: id,
    metadata: { pass_type_id: row.pass_type_id, expires_at: parsed.expiresAt.toISOString() },
  });

  if (firstTime) {
    // Los pases que ya tienen los clientes (identificador compartido) reciben el
    // aviso para agregar la tarjeta nueva.
    const { data: cards } = await admin
      .from("cards")
      .select("id")
      .eq("business_id", id)
      .not("apple_serial_number", "is", null)
      .returns<{ id: string }[]>();
    const ids = (cards ?? []).map((c) => c.id);
    if (ids.length > 0) {
      after(async () => {
        for (let i = 0; i < ids.length; i += 5)
          await Promise.allSettled(ids.slice(i, i + 5).map((c) => syncCardEverywhere(c)));
      });
    }
  }

  revalidatePath(`/admin/negocios/${id}`);
  const until = parsed.expiresAt.toLocaleDateString("es-CO", {
    dateStyle: "long",
    timeZone: "America/Bogota",
  });
  return {
    success: firstTime
      ? `Identificador activo hasta el ${until}. Las tarjetas nuevas ya salen con él.`
      : `Certificado renovado hasta el ${until}.`,
  };
}
