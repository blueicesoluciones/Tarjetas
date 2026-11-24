import "server-only";
import sharp from "sharp";
import { rubberStampSvg } from "./rubber-stamp-svg";

/**
 * Casilla de sello de caucho como PNG (data URI) para la imagen de Wallet.
 * Se rasteriza con sharp porque Satori no entiende filtros SVG.
 */
export async function rubberStampDataUri(opts: Parameters<typeof rubberStampSvg>[0]): Promise<string> {
  const png = await sharp(Buffer.from(rubberStampSvg(opts))).png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}
