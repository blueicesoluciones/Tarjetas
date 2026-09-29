import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import type { ServiceResult } from "@/lib/customers/service";

export function jsonError(error: string, status = 400, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: false, error, ...extra }, { status });
}

/** Lee y valida el body JSON con zod. */
export async function parseJson<T extends z.ZodType>(request: Request, schema: T) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { ok: false as const, response: jsonError("Solicitud inválida") };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false as const,
      response: jsonError(issue?.message ?? "Datos inválidos", 400, { field: issue?.path.join(".") }),
    };
  }
  return { ok: true as const, data: parsed.data as z.output<T> };
}

export function serviceResponse(result: ServiceResult<Record<string, unknown>>) {
  if (result.ok) return NextResponse.json(result);
  const { status = 400, ...rest } = result;
  return NextResponse.json(rest, { status });
}
