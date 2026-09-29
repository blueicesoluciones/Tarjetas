import { registerSchema } from "@/lib/customers/schemas";
import { registerCustomer } from "@/lib/customers/service";
import { parseJson, serviceResponse } from "@/lib/http/json";
import { clientIp } from "@/lib/request";

export async function POST(request: Request) {
  const parsed = await parseJson(request, registerSchema);
  if (!parsed.ok) return parsed.response;
  return serviceResponse(await registerCustomer(parsed.data, await clientIp()));
}
