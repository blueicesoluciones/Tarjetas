/**
 * Fondo de la tarjeta: color sólido o imagen teñida con el color principal
 * (el velo mantiene legible el texto sobre cualquier foto).
 */
export const BACKGROUND_OVERLAY_ALPHA = "A6"; // ~65 % de opacidad

export function cardBackgroundStyle(primaryColor: string, backgroundUrl: string | null): React.CSSProperties {
  if (!backgroundUrl) return { backgroundColor: primaryColor };
  const veil = `${primaryColor}${BACKGROUND_OVERLAY_ALPHA}`;
  return {
    backgroundColor: primaryColor,
    backgroundImage: `linear-gradient(${veil}, ${veil}), url("${backgroundUrl}")`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}
