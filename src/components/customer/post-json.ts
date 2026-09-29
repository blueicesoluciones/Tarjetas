export interface ApiResult {
  ok: boolean;
  error?: string;
  code?: string;
  field?: string;
  redirectTo?: string;
}

export async function postJson(url: string, body: unknown): Promise<ApiResult> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return (await res.json()) as ApiResult;
  } catch {
    return { ok: false, error: "Sin conexión. Revisa tu internet e intenta de nuevo." };
  }
}
