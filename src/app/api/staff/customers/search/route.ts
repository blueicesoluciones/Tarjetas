import { NextResponse, type NextRequest } from "next/server";
import { staffForApi } from "@/lib/auth/staff";
import { jsonError } from "@/lib/http/json";
import { translateDbError } from "@/lib/stamps/errors";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const ctx = await staffForApi(["owner", "cashier"]);
  if (!ctx) return jsonError("No autorizado", 401);
  const q = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 60);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("staff_search_customers", {
    p_query: q,
    p_business_id: ctx.businessId,
  });
  if (error) {
    const e = translateDbError(error);
    return jsonError(e.message, e.status);
  }
  return NextResponse.json({ ok: true, results: data ?? [] });
}
