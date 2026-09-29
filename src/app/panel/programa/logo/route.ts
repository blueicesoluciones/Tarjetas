import { NextResponse } from "next/server";
import { after } from "next/server";
import { writeAudit } from "@/lib/audit";
import { getBusinessWithProgram } from "@/lib/auth/business";
import { staffForApi } from "@/lib/auth/staff";
import { jsonError } from "@/lib/http/json";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncProgramCards } from "@/lib/wallet";

const MAX_BYTES = 2 * 1024 * 1024;
const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

/**
 * Subida del logo (Route Handler para no chocar con el límite de 1 MB de las
 * Server Actions). Solo owner del negocio o super_admin en "ver como".
 */
export async function POST(request: Request) {
  const ctx = await staffForApi(["owner"]);
  if (!ctx || !ctx.businessId) return jsonError("No autorizado", 403);

  let file: File | null = null;
  try {
    const form = await request.formData();
    const value = form.get("logo");
    file = value instanceof File ? value : null;
  } catch {
    return jsonError("Solicitud inválida");
  }
  if (!file || file.size === 0) return jsonError("Selecciona una imagen");
  const ext = EXT[file.type];
  if (!ext) return jsonError("Formato no permitido (usa PNG, JPG o WEBP)");
  if (file.size > MAX_BYTES) return jsonError("La imagen supera 2 MB");

  const { business, program } = await getBusinessWithProgram(ctx.businessId);
  if (!business) return jsonError("Negocio no encontrado", 404);

  const admin = createAdminClient();
  const path = `${business.id}/${Date.now()}.${ext}`;
  const { error: uploadError } = await admin.storage
    .from("logos")
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false, cacheControl: "31536000" });
  if (uploadError) {
    console.error("[panel] logo upload", uploadError.message);
    return jsonError("No se pudo subir la imagen", 500);
  }
  const { data: pub } = admin.storage.from("logos").getPublicUrl(path);

  const { error } = await admin.from("businesses").update({ logo_url: pub.publicUrl }).eq("id", business.id);
  if (error) return jsonError("No se pudo guardar el logo", 500);
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
    metadata: { fields: ["logo_url"] },
    impersonating: ctx.impersonating,
  });

  return NextResponse.json({ ok: true, logoUrl: pub.publicUrl });
}
