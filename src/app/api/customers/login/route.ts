import { loginSchema } from "@/lib/customers/schemas";
import { loginCustomer } from "@/lib/customers/service";
import { parseJson, serviceResponse } from "@/lib/http/json";
import { clientIp } from "@/lib/request";

export async function POST(request: Request) {
  const parsed = await parseJson(request, loginSchema);
  if (!parsed.ok) return parsed.response;
  return serviceResponse(await loginCustomer(parsed.data, await clientIp()));
}
