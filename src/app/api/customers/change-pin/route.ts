import { changePinSchema } from "@/lib/customers/schemas";
import { changePinWithTicket } from "@/lib/customers/service";
import { parseJson, serviceResponse } from "@/lib/http/json";

export async function POST(request: Request) {
  const parsed = await parseJson(request, changePinSchema);
  if (!parsed.ok) return parsed.response;
  return serviceResponse(await changePinWithTicket(parsed.data));
}
