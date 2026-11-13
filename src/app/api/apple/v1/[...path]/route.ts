import { after } from "next/server";
import { writeAudit } from "@/lib/audit";
import { LEGACY_APPLE_ACTION, LEGACY_HOSTS, requestHost } from "@/lib/domains";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncCardEverywhere } from "@/lib/wallet";
import { appleConfig } from "@/lib/wallet/apple-config";
import { buildApplePass, findAppleCard } from "@/lib/wallet/apple-pass";
import { isKnownPassType } from "@/lib/wallet/apple-pass-types";

/**
 * Web Service de Apple Wallet (CLAUDE.md §12):
 * - POST   devices/{device}/registrations/{passTypeId}/{serial}   registrar iPhone
 * - DELETE devices/{device}/registrations/{passTypeId}/{serial}   quitar registro
 * - GET    devices/{device}/registrations/{passTypeId}?passesUpdatedSince=  seriales cambiados
 * - GET    passes/{passTypeId}/{serial}                            pase actualizado
 * - POST   log                                                     errores del dispositivo
 * {passTypeId} es el compartido o el propio de un negocio.
 */
type Ctx = RouteContext<"/api/apple/v1/[...path]">;

const empty = (status: number) => new Response(null, { status });
const SAFE = /^[A-Za-z0-9._-]{1,200}$/;

async function parse(ctx: Ctx) {
  const { path } = await ctx.params;
  if (!appleConfig() || !path.every((p) => SAFE.test(p))) return null;
  // Posición del passTypeId según la ruta.
  const typeAt = path[0] === "devices" ? 3 : path[0] === "passes" ? 1 : -1;
  if (typeAt >= 0 && (!path[typeAt] || !(await isKnownPassType(path[typeAt])))) return null;
  return { path };
}

export async function POST(request: Request, ctx: Ctx) {
  const p = await parse(ctx);
  if (!p) return empty(404);
  const { path } = p;

  if (path.length === 1 && path[0] === "log") {
    const body = (await request.json().catch(() => null)) as { logs?: string[] } | null;
    for (const line of (body?.logs ?? []).slice(0, 20)) console.warn("[wallet:apple] dispositivo:", String(line).slice(0, 500));
    return empty(200);
  }

  if (path.length === 5 && path[0] === "devices" && path[2] === "registrations") {
    const [, device, , passTypeId, serial] = path;
    const card = await findAppleCard(serial, request.headers.get("authorization"));
    if (!card) return empty(401);
    const body = (await request.json().catch(() => null)) as { pushToken?: string } | null;
    const pushToken = body?.pushToken;
    if (!pushToken || !/^[0-9a-f]{16,200}$/i.test(pushToken)) return empty(400);

    noteLegacy(request, card);
    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("apple_device_registrations")
      .select("id")
      .eq("device_library_identifier", device)
      .eq("pass_type_identifier", passTypeId)
      .eq("serial_number", serial)
      .maybeSingle<{ id: string }>();
    if (existing) {
      await admin.from("apple_device_registrations").update({ push_token: pushToken }).eq("id", existing.id);
      return empty(200);
    }
    const { error } = await admin.from("apple_device_registrations").insert({
      device_library_identifier: device,
      push_token: pushToken,
      pass_type_identifier: passTypeId,
      serial_number: serial,
    });
    if (error) {
      console.error("[wallet:apple] registro", error.message);
      return empty(500);
    }
    // Si ya tenía guardado el pase anterior (identificador compartido), se actualiza
    // para que quede anulado y no queden dos tarjetas activas.
    after(async () => {
      const { count } = await admin
        .from("apple_device_registrations")
        .select("id", { count: "exact", head: true })
        .eq("serial_number", serial)
        .neq("pass_type_identifier", passTypeId);
      if (count) await syncCardEverywhere(card.id);
    });
    return empty(201);
  }

  return empty(404);
}

export async function DELETE(request: Request, ctx: Ctx) {
  const p = await parse(ctx);
  if (!p) return empty(404);
  const { path } = p;
  if (!(path.length === 5 && path[0] === "devices" && path[2] === "registrations")) {
    return empty(404);
  }
  const [, device, , passTypeId, serial] = path;
  const card = await findAppleCard(serial, request.headers.get("authorization"));
  if (!card) return empty(401);
  // Al cambiar de dominio, el iPhone se da de baja en la dirección vieja y se
  // registra en la nueva, en cualquier orden. Las dos usan esta misma tabla, así
  // que una baja por la dirección vieja se ignora para no borrar el registro
  // nuevo. Si el cliente de verdad quitó el pase, APNs responde 410 en el
  // siguiente aviso y el registro se borra solo (apns.ts).
  if (LEGACY_HOSTS.includes(requestHost(request))) return empty(200);
  await createAdminClient()
    .from("apple_device_registrations")
    .delete()
    .eq("device_library_identifier", device)
    .eq("pass_type_identifier", passTypeId)
    .eq("serial_number", serial);
  return empty(200);
}

export async function GET(request: Request, ctx: Ctx) {
  const p = await parse(ctx);
  if (!p) return empty(404);
  const { path } = p;

  // Seriales de este dispositivo que cambiaron desde la marca indicada.
  if (path.length === 4 && path[0] === "devices" && path[2] === "registrations") {
    const [, device, , passTypeId] = path;
    const admin = createAdminClient();
    const { data: regs } = await admin
      .from("apple_device_registrations")
      .select("serial_number")
      .eq("device_library_identifier", device)
      .eq("pass_type_identifier", passTypeId)
      .returns<{ serial_number: string }[]>();
    if (!regs || regs.length === 0) return empty(204);

    const since = new URL(request.url).searchParams.get("passesUpdatedSince");
    let query = admin
      .from("cards")
      .select("apple_serial_number, updated_at")
      .in("apple_serial_number", regs.map((r) => r.serial_number));
    if (since && !Number.isNaN(Date.parse(since))) query = query.gt("updated_at", new Date(since).toISOString());
    const { data: cards } = await query.returns<{ apple_serial_number: string; updated_at: string }[]>();
    if (!cards || cards.length === 0) return empty(204);

    const lastUpdated = cards.reduce((max, c) => (c.updated_at > max ? c.updated_at : max), cards[0].updated_at);
    return Response.json({ serialNumbers: cards.map((c) => c.apple_serial_number), lastUpdated });
  }

  // Pase actualizado.
  if (path.length === 3 && path[0] === "passes") {
    const card = await findAppleCard(path[2], request.headers.get("authorization"));
    if (!card) return empty(401);
    noteLegacy(request, card);
    const ifModifiedSince = request.headers.get("if-modified-since");
    const lastModified = new Date(card.updatedAt);
    lastModified.setMilliseconds(0);
    if (ifModifiedSince && !Number.isNaN(Date.parse(ifModifiedSince)) && lastModified <= new Date(ifModifiedSince)) {
      return empty(304);
    }
    try {
      const result = await buildApplePass(card.id, path[1]);
      if (!result) return empty(404);
      return new Response(new Uint8Array(result.buffer), {
        headers: {
          "Content-Type": "application/vnd.apple.pkpass",
          "Last-Modified": lastModified.toUTCString(),
          "Cache-Control": "no-store",
        },
      });
    } catch (err) {
      console.error("[wallet:apple] pase actualizado", card.id, err instanceof Error ? err.message : err);
      return empty(500);
    }
  }

  return empty(404);
}

/**
 * Anota cuando un iPhone usa la dirección vieja, para saber en /admin cuándo ya
 * nadie depende de ella y se puede quitar de Vercel.
 */
function noteLegacy(request: Request, card: { id: string; businessId?: string }) {
  if (!LEGACY_HOSTS.includes(requestHost(request))) return;
  after(() =>
    writeAudit({
      businessId: card.businessId ?? null,
      actorId: null,
      action: LEGACY_APPLE_ACTION,
      entityType: "card",
      entityId: card.id,
    }),
  );
}
