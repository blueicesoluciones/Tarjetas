import { NextResponse } from "next/server";
import { staffForApi } from "@/lib/auth/staff";
import { regenerateCustomerLink } from "@/lib/customers/staff-actions";
import { appUrl } from "@/lib/env";
import { jsonError } from "@/lib/http/json";
import { UUID_RE } from "@/lib/stamps/actions";

export async function POST(_request: Request, ctx: RouteContext<"/api/staff/customers/[id]/regenerate-link">) {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return jsonError("Cliente inválido", 400);
  const staff = await staffForApi(["owner"]);
  if (!staff) return jsonError("No autorizado", 403);

  const result = await regenerateCustomerLink(staff, id);
  if (!result) return jsonError("Cliente no encontrado", 404);
  return NextResponse.json(
    { ok: true, url: appUrl(`/t/${result.accessToken}`) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
