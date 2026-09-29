import { z } from "zod";
import { jsonError, parseJson } from "@/lib/http/json";
import { UUID_RE, runCardRpc } from "@/lib/stamps/actions";

const schema = z.object({
  delta: z.number().int().min(-100).max(100).refine((n) => n !== 0, "La cantidad no puede ser 0"),
  note: z.string().trim().min(1, "El motivo es obligatorio").max(200),
});

/** Ajuste manual (solo owner / super_admin). cardRef = id de la tarjeta. */
export async function POST(request: Request, ctx: RouteContext<"/api/staff/cards/[cardRef]/adjust">) {
  const { cardRef } = await ctx.params;
  if (!UUID_RE.test(cardRef)) return jsonError("Tarjeta inválida", 400);
  const parsed = await parseJson(request, schema);
  if (!parsed.ok) return parsed.response;
  return runCardRpc(
    "manual_adjust",
    { p_card_id: cardRef, p_delta: parsed.data.delta, p_note: parsed.data.note },
    { roles: ["owner"], sync: { notifyFrom: () => null } },
  );
}
