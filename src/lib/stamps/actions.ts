import "server-only";
import { after, NextResponse } from "next/server";
import { staffForApi } from "@/lib/auth/staff";
import { jsonError } from "@/lib/http/json";
import { createClient } from "@/lib/supabase/server";
import { syncCardEverywhere } from "@/lib/wallet";
import type { CardState, StaffRole } from "@/types/db";
import { translateDbError } from "./errors";

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const PUBLIC_CODE_RE = /^[A-Za-z0-9_-]{12,64}$/;

type RpcName = "add_stamp" | "redeem_reward" | "manual_adjust" | "undo_stamp_event" | "staff_card_summary";

/**
 * Ejecuta una función Postgres con la sesión del staff (valida rol y negocio
 * en la base de datos) y sincroniza Wallet en segundo plano.
 */
export async function runCardRpc(
  fn: RpcName,
  args: Record<string, unknown>,
  opts: {
    roles?: StaffRole[];
    /** Sincronizar Wallet. `notifyFrom` da el conteo previo para decidir si notificar. */
    sync?: { notifyFrom?: (state: CardState) => number | null };
  } = {},
) {
  const ctx = await staffForApi(opts.roles ?? ["owner", "cashier"]);
  if (!ctx) return jsonError("No autorizado", 401);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    const e = translateDbError(error);
    if (e.code === "UNKNOWN") console.error(`[rpc:${fn}]`, error.message);
    return NextResponse.json({ ok: false, code: e.code, error: e.message }, { status: e.status });
  }

  const state = data as CardState;
  // Super admin en "ver como": solo opera sobre el negocio elegido.
  if (ctx.impersonating && state.business_id !== ctx.businessId) {
    return jsonError("Tarjeta no encontrada", 404);
  }

  if (opts.sync) {
    const notifyFrom = opts.sync.notifyFrom;
    after(() =>
      syncCardEverywhere(state.card_id, notifyFrom ? { stampsBefore: notifyFrom(state) } : {}),
    );
  }
  return NextResponse.json({ ok: true, card: state });
}
