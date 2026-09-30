import { NextResponse } from "next/server";
import { getCardByAccessToken } from "@/lib/cards/public-card";
import { createCardEverywhere, googleWallet, loadWalletCardData } from "@/lib/wallet";

/** Botón "Agregar a Google Wallet": asegura el objeto y redirige con el JWT. */
export async function GET(request: Request, ctx: RouteContext<"/api/wallet/google/save/[accessToken]">) {
  const { accessToken } = await ctx.params;
  const card = await getCardByAccessToken(accessToken);
  if (!card) return new NextResponse("Tarjeta no encontrada", { status: 404 });

  const back = new URL(`/t/${accessToken}?wallet=error`, request.url);
  if (!googleWallet.isEnabled()) return NextResponse.redirect(back);

  try {
    let data = await loadWalletCardData(card.id);
    if (data && !data.googleObjectId) {
      await createCardEverywhere(card.id);
      data = await loadWalletCardData(card.id);
    }
    // Si Google rechazó la clase o el objeto (ej. imágenes no públicas), no se
    // redirige a Google: el cliente vería un error allá.
    if (!data?.googleObjectId) return NextResponse.redirect(back);
    const url = await googleWallet.getAddToWalletUrl(data);
    return NextResponse.redirect(url, { headers: { "Referrer-Policy": "no-referrer" } });
  } catch (err) {
    console.error("[wallet:google] save", card.id, err instanceof Error ? err.message : err);
    return NextResponse.redirect(back);
  }
}
