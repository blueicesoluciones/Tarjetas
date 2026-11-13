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
export async function roundLogo(input: ArrayBuffer, opts: { contain?: boolean } = {}): Promise<Buffer> {
  // contain: el logo completo, con margen, sobre fondo blanco (sirve para logos
  // alargados o con texto, que recortados al centro perderían partes).
  const base = opts.contain
    ? sharp(
        await sharp(Buffer.from(input))
          .rotate()
          .resize(Math.round(BRANCH_LOGO_SIZE * 0.72), Math.round(BRANCH_LOGO_SIZE * 0.72), {
            fit: "contain",
            background: { r: 255, g: 255, b: 255, alpha: 0 },
          })
          .png()
          .toBuffer(),
      )
        .extend({
          top: Math.round(BRANCH_LOGO_SIZE * 0.14),
          bottom: BRANCH_LOGO_SIZE - Math.round(BRANCH_LOGO_SIZE * 0.72) - Math.round(BRANCH_LOGO_SIZE * 0.14),
          left: Math.round(BRANCH_LOGO_SIZE * 0.14),
          right: BRANCH_LOGO_SIZE - Math.round(BRANCH_LOGO_SIZE * 0.72) - Math.round(BRANCH_LOGO_SIZE * 0.14),
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        })
        .flatten({ background: "#ffffff" })
    : sharp(Buffer.from(input)).rotate().resize(BRANCH_LOGO_SIZE, BRANCH_LOGO_SIZE, { fit: "cover", position: "centre" });
  return sharp(await base.png().toBuffer())
    .resize(BRANCH_LOGO_SIZE, BRANCH_LOGO_SIZE)
    .ensureAlpha()
    .composite([{ input: CIRCLE_MASK, blend: "dest-in" }])
    .png()
    .toBuffer();
}
