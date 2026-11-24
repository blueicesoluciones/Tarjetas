import { GIFT_ICON_PATHS } from "./stamp-layout";

/**
 * Casilla de sello con aspecto de sello de caucho (como el de la portada): aro
 * grueso, aro fino, corona de puntos y bordes de tinta irregulares. El mismo SVG
 * se usa en la tarjeta web (navegador) y, rasterizado con sharp, en la imagen de
 * Wallet, para que ambas se vean iguales.
 *
 * - `none`: casilla vacía (con `label`, su número).
 * - `gift`: casilla con premio.
 * - `icon`: sello puesto con el ícono del programa, calado en el centro entintado.
 * - `image`: sello puesto con un logo o imagen propia dentro del aro.
 */
export type RubberStampContent =
  | { kind: "none" }
  | { kind: "gift" }
  | { kind: "icon" }
  | { kind: "image"; href: string };

/** Inclinación leve y fija de cada sello puesto, como puesto a mano. */
export const STAMP_TILTS = [-8, 5, -4, 7, -6, 3, -7, 6, -3, 8];
/** Texturas de tinta distintas (se reparten entre los sellos puestos). */
export const STAMP_SEEDS = [3, 10, 17, 24];

const DOTS = Array.from({ length: 28 }, (_, i) => {
  const a = (i / 28) * Math.PI * 2;
  return `<circle cx="${(100 + 86 * Math.cos(a)).toFixed(2)}" cy="${(100 + 86 * Math.sin(a)).toFixed(2)}" r="1.7" stroke="none"/>`;
}).join("");

function attr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/**
 * Definiciones compartidas (filtros de tinta, recorte del logo y el calado del
 * ícono). `prefix` hace únicos los id dentro de la página.
 */
export function rubberStampDefs(prefix: string, icon: { d: string; fill: boolean }): string {
  const filters = STAMP_SEEDS.map(
    (seed, i) => `<filter id="${prefix}-ink${i}" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3" seed="${seed}" result="warp"/>
      <feDisplacementMap in="SourceGraphic" in2="warp" scale="2.6" result="rough"/>
      <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="${seed + 5}" result="speck"/>
      <feColorMatrix in="speck" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -4 0 0 0 3.3" result="holes"/>
      <feComposite in="rough" in2="holes" operator="in"/>
    </filter>`,
  ).join("");
  const iconPath = icon.fill
    ? `<path d="${attr(icon.d)}" fill="black" stroke="none"/>`
    : `<path d="${attr(icon.d)}" fill="none" stroke="black" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`;
  return `${filters}
    <clipPath id="${prefix}-clip"><circle cx="100" cy="100" r="68"/></clipPath>
    <mask id="${prefix}-cut" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">
      <rect width="200" height="200" fill="white"/>
      <g transform="translate(100 100) scale(3.3) translate(-12 -12)">${iconPath}</g>
    </mask>`;
}

/** Contenido de una casilla (viewBox 200), usando las definiciones de `prefix`. */
export function rubberStampBody(
  prefix: string,
  opts: { ink: string; opacity: number; content: RubberStampContent; seedIndex?: number; label?: string },
): string {
  const { ink, opacity, content, seedIndex = 0, label } = opts;
  const inner =
    content.kind === "icon"
      ? `<circle cx="100" cy="100" r="68" stroke="none" mask="url(#${prefix}-cut)"/>`
      : content.kind === "gift"
        ? `<g transform="translate(100 100) scale(3.4) translate(-12 -12)" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${GIFT_ICON_PATHS.map(
            (d) => `<path d="${d}"/>`,
          ).join("")}</g>`
        : "";
  const image =
    content.kind === "image"
      ? `<image href="${attr(content.href)}" x="32" y="32" width="136" height="136" preserveAspectRatio="xMidYMid slice" clip-path="url(#${prefix}-clip)"/>`
      : "";
  const text = label
    ? `<text x="100" y="102" text-anchor="middle" dominant-baseline="middle" font-size="58" fill="${ink}" stroke="none">${attr(label)}</text>`
    : "";
  return `<g opacity="${opacity}">
    ${image}
    <g filter="url(#${prefix}-ink${seedIndex % STAMP_SEEDS.length})" fill="${ink}" stroke="${ink}">
      <circle cx="100" cy="100" r="95" fill="none" stroke-width="7"/>
      <circle cx="100" cy="100" r="76" fill="none" stroke-width="2.6"/>
      ${DOTS}
      ${inner}
    </g>
    ${text}
  </g>`;
}

/** SVG completo de una casilla (para rasterizar en el servidor). */
export function rubberStampSvg(opts: {
  px: number;
  ink: string;
  opacity: number;
  content: RubberStampContent;
  icon: { d: string; fill: boolean };
  seedIndex?: number;
}): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${opts.px}" height="${opts.px}" viewBox="0 0 200 200"><defs>${rubberStampDefs(
    "s",
    opts.icon,
  )}</defs>${rubberStampBody("s", opts)}</svg>`;
}
