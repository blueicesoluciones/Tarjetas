/**
 * PostgREST devuelve como máximo `max_rows` filas por consulta (1000 en Supabase),
 * aunque se pida `.limit(20000)`: el resto se pierde sin error. Para contar o
 * sumar en JS hay que leer por páginas.
 */
export const PAGE_SIZE = 1000;

interface PageResult<T> {
  data: T[] | null;
  error: { message: string } | null;
}

/**
 * Lee todas las filas pidiendo páginas `[from, to]` (inclusive) hasta recibir
 * una incompleta. La consulta debe tener un orden estable (ej. `.order("id")`)
 * para que las páginas no se solapen.
 */
export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize = PAGE_SIZE,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await page(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const chunk = data ?? [];
    rows.push(...chunk);
    if (chunk.length < pageSize) return rows;
  }
}
