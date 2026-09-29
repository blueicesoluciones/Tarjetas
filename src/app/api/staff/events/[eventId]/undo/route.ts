import { jsonError } from "@/lib/http/json";
import { UUID_RE, runCardRpc } from "@/lib/stamps/actions";

export async function POST(_request: Request, ctx: RouteContext<"/api/staff/events/[eventId]/undo">) {
  const { eventId } = await ctx.params;
  if (!UUID_RE.test(eventId)) return jsonError("Movimiento inválido", 400);
  return runCardRpc("undo_stamp_event", { p_event_id: eventId }, { sync: {} });
}
