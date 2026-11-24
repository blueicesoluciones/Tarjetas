/**
 * Distribución de círculos (tarjeta web e imagen de Wallet). Hasta 5 en una
 * fila; de 6 a 12 en dos filas y más de 12 en tres, para que cada sello se vea
 * grande en el celular.
 */
export function stampGrid(required: number) {
  const rows = required <= 5 ? 1 : required <= 12 ? 2 : 3;
  const cols = Math.ceil(required / rows);
  return { rows, cols };
}

/** Ícono de regalo (trazos, viewBox 24) para los círculos con premio. */
export const GIFT_ICON_PATHS = [
  "M3 9h18v3.5H3z",
  "M12 9v12",
  "M19 12.5V19a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6.5",
  "M7.5 9a2.5 2.5 0 0 1 0-5C10 4 12 9 12 9s2-5 4.5-5a2.5 2.5 0 0 1 0 5",
];

/**
 * Versión del dibujo de la imagen de sellos de Wallet. Va en su URL (que se
 * cachea inmutable): se sube cada vez que cambia el diseño de la imagen.
 */
export const STAMPS_IMAGE_RENDER = 5;
