import { savedLoginSchema } from "@/lib/customers/schemas";
import { loginSavedCard } from "@/lib/customers/service";
import { parseJson, serviceResponse } from "@/lib/http/json";
import { clientIp } from "@/lib/request";

export async function POST(request: Request) {
  const parsed = await parseJson(request, savedLoginSchema);
  if (!parsed.ok) return parsed.response;
  return serviceResponse(await loginSavedCard(parsed.data, await clientIp()));
}
