import { NextResponse } from "next/server";
import { z } from "zod";
import { staffForApi } from "@/lib/auth/staff";
import { pinSchema } from "@/lib/customers/schemas";
import { resetCustomerPin } from "@/lib/customers/staff-actions";
import { jsonError } from "@/lib/http/json";
import { UUID_RE } from "@/lib/stamps/actions";

// PIN temporal opcional elegido por el dueño; si no viene, se genera uno aleatorio.
const bodySchema = z.object({ pin: pinSchema.optional() });

/** Solo owner / super_admin. Devuelve el PIN temporal una sola vez. */
export async function POST(request: Request, ctx: RouteContext<"/api/staff/customers/[id]/reset-pin">) {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return jsonError("Cliente inválido", 400);
  const staff = await staffForApi(["owner"]);
  if (!staff) return jsonError("No autorizado", 403);

  const raw = await request.text();
  const parsed = bodySchema.safeParse(raw ? JSON.parse(raw) : {});
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "PIN inválido", 400);

  const result = await resetCustomerPin(staff, id, parsed.data.pin);
  if (!result) return jsonError("Cliente no encontrado", 404);
  return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
}
