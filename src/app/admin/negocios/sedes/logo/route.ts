import { NextResponse } from "next/server";
import { after } from "next/server";
import { z } from "zod";
import { writeAudit } from "@/lib/audit";
import { staffForApi, type StaffContext } from "@/lib/auth/staff";
import { roundLogo } from "@/lib/cards/round-logo";
import { jsonError } from "@/lib/http/json";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncProgramCards } from "@/lib/wallet";

const TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;

/** Guarda (o quita) el logo de la sede y actualiza las tarjetas en Wallet. */
async function saveLogo(ctx: StaffContext, branch: { id: string; business_id: string; name: string }, url: string | null) {
  const admin = createAdminClient();
  const { error } = await admin.from("branches").update({ logo_url: url }).eq("id", branch.id);
  if (error) return jsonError("No se pudo guardar el logo", 500);
  const { data: program } = await admin
    .from("programs")
    .select("id")
    .eq("business_id", branch.business_id)
    .eq("is_active", true)
    .maybeSingle<{ id: string }>();
  if (program) after(() => syncProgramCards(program.id));
  await writeAudit({
    businessId: branch.business_id,
    actorId: ctx.userId,
    action: "branch.logo",
    entityType: "branch",
    entityId: branch.id,
    metadata: { name: branch.name, removed: url === null },
  });
  return NextResponse.json({ ok: true, url });
}

async function findBranch(id: unknown) {
  const parsed = z.guid().safeParse(id);
  if (!parsed.success) return null;
  const { data } = await createAdminClient()
    .from("branches")
    .select("id, business_id, name")
    .eq("id", parsed.data)
    .maybeSingle<{ id: string; business_id: string; name: string }>();
  return data;
}

/** Sube el logo de una sede (solo super admin). Se guarda ya recortado en círculo. */
export async function POST(request: Request) {
  const ctx = await staffForApi([]);
  if (!ctx) return jsonError("No autorizado", 403);

  let file: File | null = null;
  let branchId: unknown = null;
  try {
    const form = await request.formData();
    branchId = form.get("branchId");
    const value = form.get("file");
    file = value instanceof File ? value : null;
  } catch {
    return jsonError("Solicitud inválida");
  }
  const branch = await findBranch(branchId);
  if (!branch) return jsonError("Sede no encontrada", 404);
  if (!file || file.size === 0) return jsonError("Selecciona una imagen");
  if (!TYPES.has(file.type)) return jsonError("Usa una imagen PNG, JPG o WEBP");
  if (file.size > MAX_BYTES) return jsonError("La imagen supera 5 MB");

  let png: Buffer;
  try {
    png = await roundLogo(await file.arrayBuffer());
  } catch {
    return jsonError("No pudimos leer la imagen, prueba con otra");
  }
  const admin = createAdminClient();
  const path = `${branch.business_id}/branch-${branch.id}-${Date.now()}.png`;
  const { error } = await admin.storage
    .from("logos")
    .upload(path, png, { contentType: "image/png", upsert: false, cacheControl: "31536000" });
  if (error) {
    console.error("[admin] branch logo upload", error.message);
    return jsonError("No se pudo subir el logo", 500);
  }
  const { data: pub } = admin.storage.from("logos").getPublicUrl(path);
  return saveLogo(ctx, branch, pub.publicUrl);
}

/** Quita el logo: los sellos de esa sede vuelven a verse con el chulo. */
export async function DELETE(request: Request) {
  const ctx = await staffForApi([]);
  if (!ctx) return jsonError("No autorizado", 403);
  const branch = await findBranch(new URL(request.url).searchParams.get("branchId"));
  if (!branch) return jsonError("Sede no encontrada", 404);
  return saveLogo(ctx, branch, null);
}
