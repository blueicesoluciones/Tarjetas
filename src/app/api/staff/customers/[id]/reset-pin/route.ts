import { NextResponse } from "next/server";
import { staffForApi } from "@/lib/auth/staff";
import { resetCustomerPin } from "@/lib/customers/staff-actions";
import { jsonError } from "@/lib/http/json";
import { UUID_RE } from "@/lib/stamps/actions";

/** Solo owner / super_admin. Devuelve el PIN temporal una sola vez. */
export async function POST(_request: Request, ctx: RouteContext<"/api/staff/customers/[id]/reset-pin">) {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return jsonError("Cliente inválido", 400);
  const staff = await staffForApi(["owner"]);
  if (!staff) return jsonError("No autorizado", 403);

  const result = await resetCustomerPin(staff, id);
  if (!result) return jsonError("Cliente no encontrado", 404);
  return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
}
