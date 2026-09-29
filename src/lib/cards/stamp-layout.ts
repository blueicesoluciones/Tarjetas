/** Distribución de círculos para la imagen de sellos (1032×336). */
export function stampGrid(required: number) {
  const rows = required <= 10 ? 1 : required <= 20 ? 2 : 3;
  const cols = Math.ceil(required / rows);
  return { rows, cols };
}
