import { jsonError } from "@/lib/http/json";
import { PUBLIC_CODE_RE, runCardRpc } from "@/lib/stamps/actions";

/** +1 sello. cardRef = public_code. */
export async function POST(_request: Request, ctx: RouteContext<"/api/staff/cards/[cardRef]/stamp">) {
  const { cardRef } = await ctx.params;
  if (!PUBLIC_CODE_RE.test(cardRef)) return jsonError("Este código no es una tarjeta válida", 400);
  return runCardRpc("add_stamp", { p_public_code: cardRef }, { sync: { notifyFrom: (s) => s.stamps_count - 1 } });
}
