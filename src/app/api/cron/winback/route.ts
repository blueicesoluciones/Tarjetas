import { NextResponse } from "next/server";
import { runWinback } from "@/lib/winback-run";

/**
 * Lo ejecuta Vercel Cron una vez al día (vercel.json). Vercel envía
 * `Authorization: Bearer $CRON_SECRET`; sin esa clave no se ejecuta.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("No autorizado", { status: 401 });
  }
  const summary = await runWinback();
  console.log("[cron:winback]", JSON.stringify(summary));
  return NextResponse.json({ ok: true, summary });
}
