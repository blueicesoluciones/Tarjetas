/**
 * Diseño de los sellos puestos (planes con `customStamp`). Sin "server-only":
 * lo usan la tarjeta web, la vista previa del panel y la imagen de Wallet.
 */
export type StampIcon = "check" | "star" | "heart" | "image";

export const STAMP_ICONS: StampIcon[] = ["check", "star", "heart", "image"];

export const STAMP_ICON_LABELS: Record<StampIcon, string> = {
  check: "Chulo",
  star: "Estrella",
  heart: "Corazón",
  image: "Tu imagen",
};

/** Trazos de cada ícono (viewBox 24). `fill`: relleno; si no, solo trazo. */
export const STAMP_ICON_SHAPES: Record<Exclude<StampIcon, "image">, { d: string; fill: boolean }> = {
  check: { d: "M4 12.5l5 5L20 6.5", fill: false },
  star: { d: "M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.5L12 17.3l-5.9 3.2 1.3-6.5-4.9-4.6 6.6-.8z", fill: true },
  heart: {
    d: "M12 20.5s-7.6-4.5-9.4-9.3C1.3 7.8 3.4 4 7 4c2.1 0 3.8 1.1 5 2.8C13.2 5.1 14.9 4 17 4c3.6 0 5.7 3.8 4.4 7.2-1.8 4.8-9.4 9.3-9.4 9.3z",
    fill: true,
  },
};

/** Cómo se dibuja un sello puesto: un ícono o una imagen redonda. */
export interface StampStyle {
  icon: Exclude<StampIcon, "image">;
  imageUrl: string | null;
}

export const DEFAULT_STAMP_STYLE: StampStyle = { icon: "check", imageUrl: null };

export function isStampIcon(value: unknown): value is StampIcon {
  return typeof value === "string" && (STAMP_ICONS as string[]).includes(value);
}

/**
 * Diseño efectivo según el plan: sin `customStamp` (o sin imagen guardada) se
 * dibuja el chulo de siempre.
 */
export function resolveStampStyle(allowed: boolean, icon: string | null | undefined, imageUrl: string | null | undefined): StampStyle {
  if (!allowed || !isStampIcon(icon)) return DEFAULT_STAMP_STYLE;
  if (icon === "image") return imageUrl ? { icon: "check", imageUrl } : DEFAULT_STAMP_STYLE;
  return { icon, imageUrl: null };
}
