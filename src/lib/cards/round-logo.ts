import "server-only";
import sharp from "sharp";

/** Lado del logo de sede guardado (se ve dentro de cada sello). */
export const BRANCH_LOGO_SIZE = 256;

const CIRCLE_MASK = Buffer.from(
  `<svg width="${BRANCH_LOGO_SIZE}" height="${BRANCH_LOGO_SIZE}"><circle cx="${BRANCH_LOGO_SIZE / 2}" cy="${BRANCH_LOGO_SIZE / 2}" r="${BRANCH_LOGO_SIZE / 2}" fill="#fff"/></svg>`,
);

/**
 * Deja cualquier imagen (cuadrada, alargada, con o sin transparencia) como un
 * círculo PNG: recorta al centro, la ajusta al tamaño y vuelve transparentes
 * las esquinas. Así el logo siempre se ve redondo dentro del sello.
 */
export async function roundLogo(input: ArrayBuffer): Promise<Buffer> {
  return sharp(Buffer.from(input))
    .rotate()
    .resize(BRANCH_LOGO_SIZE, BRANCH_LOGO_SIZE, { fit: "cover", position: "centre" })
    .ensureAlpha()
    .composite([{ input: CIRCLE_MASK, blend: "dest-in" }])
    .png()
    .toBuffer();
}
