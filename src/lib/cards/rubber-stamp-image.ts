import "server-only";
import sharp from "sharp";
import { GIFT_ICON_PATHS } from "./stamp-layout";

/**
 * Casilla de sello con aspecto de sello de caucho (como el de la portada):
 * aro grueso, aro fino, una corona de puntos entre ambos y bordes de tinta
 * irregulares. Se dibuja con sharp (librsvg sí entiende los filtros SVG; Satori
 * no) y vuelve como data URI para ponerla en la imagen de Wallet.
 *
 * - `content: "none"`: casilla vacía (el número lo pone Satori encima).
 * - `"gift"`: casilla con premio.
 * - `"icon"`: sello puesto con el ícono del programa (chulo, estrella, corazón).
 * - `"image"`: sello puesto con un logo o imagen propia dentro del aro.
 */
export type RubberStampContent =
  | { kind: "none" }
  | { kind: "gift" }
  | { kind: "icon"; d: string; fill: boolean }
  | { kind: "image"; dataUri: string };

const DOTS = Array.from({ length: 28 }, (_, i) => {
  const a = (i / 28) * Math.PI * 2;
  return `<circle cx="${(100 + 86 * Math.cos(a)).toFixed(2)}" cy="${(100 + 86 * Math.sin(a)).toFixed(2)}" r="1.7" stroke="none"/>`;
}).join("");

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** SVG de la casilla (viewBox 200). `seed` varía la textura de la tinta. */
export function rubberStampSvg(opts: { px: number; ink: string; opacity: number; content: RubberStampContent; seed?: number }) {
  const { px, ink, opacity, content, seed = 4 } = opts;
  // Sello puesto con ícono: el centro va entintado y el ícono queda calado
  // (se ve el fondo de la tarjeta a través), como la huella de un sello real.
  const icon =
    content.kind === "icon"
      ? `<g transform="translate(100 100) scale(3.3) translate(-12 -12)"><path d="${escapeAttr(content.d)}" ${
          content.fill
            ? `fill="black" stroke="none"`
            : `fill="none" stroke="black" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"`
        }/></g>`
      : "";
  const inner =
    content.kind === "icon"
      ? `<circle cx="100" cy="100" r="68" stroke="none" mask="url(#cut)"/>`
      : content.kind === "gift"
        ? `<g transform="translate(100 100) scale(3.4) translate(-12 -12)" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${GIFT_ICON_PATHS.map(
            (d) => `<path d="${d}"/>`,
          ).join("")}</g>`
        : "";
  const image =
    content.kind === "image"
      ? `<image href="${escapeAttr(content.dataUri)}" x="32" y="32" width="136" height="136" preserveAspectRatio="xMidYMid slice" clip-path="url(#clip)"/>`
      : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 200 200">
  <defs>
    <filter id="ink" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3" seed="${seed}" result="warp"/>
      <feDisplacementMap in="SourceGraphic" in2="warp" scale="2.6" result="rough"/>
      <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="${seed + 5}" result="speck"/>
      <feColorMatrix in="speck" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -4 0 0 0 3.3" result="holes"/>
      <feComposite in="rough" in2="holes" operator="in"/>
    </filter>
    <clipPath id="clip"><circle cx="100" cy="100" r="68"/></clipPath>
    <mask id="cut" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">
      <rect width="200" height="200" fill="white"/>
      ${icon}
    </mask>
  </defs>
  <g opacity="${opacity}">
    ${image}
    <g filter="url(#ink)" fill="${ink}" stroke="${ink}">
      <circle cx="100" cy="100" r="95" fill="none" stroke-width="7"/>
      <circle cx="100" cy="100" r="76" fill="none" stroke-width="2.6"/>
      ${DOTS}
      ${inner}
    </g>
  </g>
</svg>`;
}

/** PNG de la casilla como data URI. */
export async function rubberStampDataUri(opts: Parameters<typeof rubberStampSvg>[0]): Promise<string> {
  const png = await sharp(Buffer.from(rubberStampSvg(opts))).png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}
