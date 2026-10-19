import { z } from "zod";
import { jsonError } from "@/lib/http/json";
import { UUID_RE, runCardRpc } from "@/lib/stamps/actions";

const bodySchema = z.object({ stampsAt: z.number().int().min(1).max(29) });

/** Entregar un premio intermedio (no resta sellos). cardRef = id de la tarjeta. */
export async function POST(request: Request, ctx: RouteContext<"/api/staff/cards/[cardRef]/redeem-milestone">) {
  const { cardRef } = await ctx.params;
  if (!UUID_RE.test(cardRef)) return jsonError("Tarjeta inválida", 400);
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Premio inválido", 400);
  return runCardRpc("redeem_milestone", { p_card_id: cardRef, p_stamps_at: parsed.data.stampsAt }, { withBranch: true, sync: {} });
}
