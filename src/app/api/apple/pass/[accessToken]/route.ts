import { getCardByAccessToken } from "@/lib/cards/public-card";
import { buildApplePass } from "@/lib/wallet/apple-pass";

/** Descarga del .pkpass (botón «Agregar a Apple Wallet»). El enlace personal es la credencial. */
export async function GET(_request: Request, ctx: RouteContext<"/api/apple/pass/[accessToken]">) {
  const { accessToken } = await ctx.params;
  const card = await getCardByAccessToken(accessToken);
  if (!card) return new Response("Not found", { status: 404 });

  try {
    const result = await buildApplePass(card.id);
    if (!result) return new Response("Not found", { status: 404 });
    return new Response(new Uint8Array(result.buffer), {
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": `attachment; filename="tarjeta.pkpass"`,
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (err) {
    console.error("[wallet:apple] pass", card.id, err instanceof Error ? err.message : err);
    return Response.redirect(new URL(`/t/${accessToken}?wallet=error`, _request.url), 303);
  }
}
