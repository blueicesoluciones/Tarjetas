import { NextResponse } from "next/server";
import { after } from "next/server";
import { writeAudit } from "@/lib/audit";
import { getBusinessWithProgram } from "@/lib/auth/business";
import { staffForApi, type StaffContext } from "@/lib/auth/staff";
import { jsonError } from "@/lib/http/json";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncProgramCards } from "@/lib/wallet";

type Kind = "logo" | "background";

// El fondo también se dibuja en la imagen de Google Wallet (Satori), que no
// soporta WEBP: por eso el fondo solo admite PNG o JPG.
const RULES: Record<Kind, { column: "logo_url" | "card_background_url"; maxBytes: number; types: Record<string, string> }> = {
  logo: {
    column: "logo_url",
    maxBytes: 2 * 1024 * 1024,
    types: { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" },
  },
  background: {
    column: "card_background_url",
    maxBytes: 5 * 1024 * 1024,
    types: { "image/png": "png", "image/jpeg": "jpg" },
  },
};

function parseKind(value: unknown): Kind | null {
  return value === "logo" || value === "background" ? value : null;
}

/** Guarda la URL, incrementa design_version y sincroniza Wallet. */
async function saveImage(ctx: StaffContext, kind: Kind, url: string | null) {
  const { business, program } = await getBusinessWithProgram(ctx.businessId!);
  if (!business) return jsonError("Negocio no encontrado", 404);

  const admin = createAdminClient();
  const { error } = await admin.from("businesses").update({ [RULES[kind].column]: url }).eq("id", business.id);
  if (error) return jsonError("No se pudo guardar la imagen", 500);
  if (program) {
    await admin.from("programs").update({ design_version: program.design_version + 1 }).eq("id", program.id);
    after(() => syncProgramCards(program.id));
  }

  await writeAudit({
    businessId: business.id,
    actorId: ctx.userId,
    action: "business.update",
    entityType: "business",
    entityId: business.id,
    metadata: { fields: [RULES[kind].column], removed: url === null },
    impersonating: ctx.impersonating,
  });
  return NextResponse.json({ ok: true, url });
}

/**
 * Subida de logo o fondo de la tarjeta (Route Handler para no chocar con el
 * límite de 1 MB de las Server Actions). Solo owner o super_admin en "ver como".
 */
export async function POST(request: Request) {
  const ctx = await staffForApi(["owner"]);
  if (!ctx || !ctx.businessId) return jsonError("No autorizado", 403);

  let file: File | null = null;
  let kind: Kind | null = null;
  try {
    const form = await request.formData();
    kind = parseKind(form.get("kind") ?? "logo");
    const value = form.get("file") ?? form.get("logo");
    file = value instanceof File ? value : null;
  } catch {
    return jsonError("Solicitud inválida");
  }
  if (!kind) return jsonError("Tipo de imagen inválido");
  const rule = RULES[kind];
  if (!file || file.size === 0) return jsonError("Selecciona una imagen");
  const ext = rule.types[file.type];
  if (!ext) return jsonError(kind === "background" ? "Usa una imagen PNG o JPG" : "Formato no permitido (usa PNG, JPG o WEBP)");
  if (file.size > rule.maxBytes) return jsonError(`La imagen supera ${rule.maxBytes / 1024 / 1024} MB`);

  const admin = createAdminClient();
  const path = `${ctx.businessId}/${kind === "background" ? "bg-" : ""}${Date.now()}.${ext}`;
  const { error: uploadError } = await admin.storage
    .from("logos")
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false, cacheControl: "31536000" });
  if (uploadError) {
    console.error("[panel] image upload", uploadError.message);
    return jsonError("No se pudo subir la imagen", 500);
  }
  const { data: pub } = admin.storage.from("logos").getPublicUrl(path);
  return saveImage(ctx, kind, pub.publicUrl);
}

/** Quita el fondo (vuelve al color sólido) o el logo (vuelve a la inicial). */
export async function DELETE(request: Request) {
  const ctx = await staffForApi(["owner"]);
  if (!ctx || !ctx.businessId) return jsonError("No autorizado", 403);
  const kind = parseKind(new URL(request.url).searchParams.get("kind"));
  if (!kind) return jsonError("Tipo de imagen inválido");
  return saveImage(ctx, kind, null);
}
