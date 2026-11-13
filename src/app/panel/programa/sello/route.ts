import { NextResponse } from "next/server";
import { after } from "next/server";
import { writeAudit } from "@/lib/audit";
import { getBusinessWithProgram } from "@/lib/auth/business";
import { staffForApi, type StaffContext } from "@/lib/auth/staff";
import { roundLogo } from "@/lib/cards/round-logo";
import { isStampIcon, type StampIcon } from "@/lib/cards/stamp-style";
import { jsonError } from "@/lib/http/json";
import { planFeatures } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncProgramCards } from "@/lib/wallet";

/**
 * Diseño del sello (Medium y Pro). POST multipart con `action`:
 * - "icon" + `icon` (check | star | heart | image): elige el diseño.
 * - "upload" + `file`: imagen propia, recortada en círculo.
 * - "logo": usa el logo del negocio, completo y centrado en un círculo blanco.
 * Cada cambio sube design_version (la imagen de Wallet cambia de URL) y
 * sincroniza las tarjetas.
 */
const TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const ctx = await staffForApi(["owner"]);
  if (!ctx?.businessId) return jsonError("No autorizado", 403);
  const { business, program } = await getBusinessWithProgram(ctx.businessId);
  if (!business || !program) return jsonError("Negocio no encontrado", 404);
  if (!planFeatures(business.plan).customStamp) {
    return jsonError("El sello personalizado está disponible desde el plan Medium", 403);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("Solicitud inválida");
  }
  const action = form.get("action");

  if (action === "icon") {
    const icon = form.get("icon");
    if (!isStampIcon(icon)) return jsonError("Diseño no válido");
    if (icon === "image" && !program.stamp_image_url) return jsonError("Primero sube una imagen");
    return save(ctx, business.id, program, { stamp_icon: icon });
  }

  let source: ArrayBuffer;
  let contain = false;
  if (action === "upload") {
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) return jsonError("Selecciona una imagen");
    if (!TYPES.has(file.type)) return jsonError("Usa una imagen PNG, JPG o WEBP");
    if (file.size > MAX_BYTES) return jsonError("La imagen supera 5 MB");
    source = await file.arrayBuffer();
  } else if (action === "logo") {
    if (!business.logo_url) return jsonError("Primero sube el logo de tu negocio en «Tarjeta y marca»");
    try {
      const res = await fetch(business.logo_url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      source = await res.arrayBuffer();
    } catch {
      return jsonError("No pudimos leer el logo del negocio", 502);
    }
    contain = true;
  } else {
    return jsonError("Acción no válida");
  }

  let png: Buffer;
  try {
    png = await roundLogo(source, { contain });
  } catch {
    return jsonError("No pudimos leer la imagen, prueba con otra");
  }
  const admin = createAdminClient();
  const path = `${business.id}/stamp-${Date.now()}.png`;
  const { error } = await admin.storage
    .from("logos")
    .upload(path, png, { contentType: "image/png", upsert: false, cacheControl: "31536000" });
  if (error) {
    console.error("[stamp-style] upload", error.message);
    return jsonError("No se pudo subir la imagen", 500);
  }
  const { data: pub } = admin.storage.from("logos").getPublicUrl(path);
  return save(ctx, business.id, program, { stamp_icon: "image", stamp_image_url: pub.publicUrl });
}

async function save(
  ctx: StaffContext,
  businessId: string,
  program: { id: string; design_version: number },
  changes: { stamp_icon: StampIcon; stamp_image_url?: string },
) {
  const { error } = await createAdminClient()
    .from("programs")
    .update({ ...changes, design_version: program.design_version + 1 })
    .eq("id", program.id);
  if (error) return jsonError("No se pudo guardar el sello", 500);
  after(() => syncProgramCards(program.id));
  await writeAudit({
    businessId,
    actorId: ctx.userId,
    action: "program.stamp_style",
    entityType: "program",
    entityId: program.id,
    metadata: { icon: changes.stamp_icon, newImage: Boolean(changes.stamp_image_url) },
    impersonating: ctx.impersonating,
  });
  return NextResponse.json({ ok: true });
}
