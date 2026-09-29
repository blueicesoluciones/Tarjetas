import { jsonError } from "@/lib/http/json";
import { PUBLIC_CODE_RE, UUID_RE, runCardRpc } from "@/lib/stamps/actions";

/** Resumen de la tarjeta para el cajero. cardRef = public_code (del QR) o id. */
export async function GET(_request: Request, ctx: RouteContext<"/api/staff/cards/[cardRef]">) {
  const { cardRef } = await ctx.params;
  if (UUID_RE.test(cardRef)) return runCardRpc("staff_card_summary", { p_card_id: cardRef });
  if (!PUBLIC_CODE_RE.test(cardRef)) return jsonError("Este código no es una tarjeta válida", 400);
  return runCardRpc("staff_card_summary", { p_public_code: cardRef });
}
