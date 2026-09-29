import { jsonError } from "@/lib/http/json";
import { UUID_RE, runCardRpc } from "@/lib/stamps/actions";

/** Canjear premio. cardRef = id de la tarjeta. */
export async function POST(_request: Request, ctx: RouteContext<"/api/staff/cards/[cardRef]/redeem">) {
  const { cardRef } = await ctx.params;
  if (!UUID_RE.test(cardRef)) return jsonError("Tarjeta inválida", 400);
  return runCardRpc("redeem_reward", { p_card_id: cardRef }, { sync: {} });
}
