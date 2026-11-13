import { describe, expect, it } from "vitest";
import { fetchAllRows } from "./fetch-all";

/** Simula PostgREST: corta cada respuesta en `maxRows` filas. */
function fakeTable(total: number, maxRows = 1000) {
  const rows = Array.from({ length: total }, (_, i) => ({ n: i }));
  const calls: [number, number][] = [];
  const page = async (from: number, to: number) => {
    calls.push([from, to]);
    return { data: rows.slice(from, Math.min(to + 1, from + maxRows)), error: null };
  };
  return { page, calls };
}

describe("fetchAllRows", () => {
  it("lee más de 1000 filas en varias páginas", async () => {
    const { page, calls } = fakeTable(2500);
    const rows = await fetchAllRows(page);
    expect(rows).toHaveLength(2500);
    expect(rows[2499]).toEqual({ n: 2499 });
    expect(calls).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it("con exactamente una página completa pide otra vacía y termina", async () => {
    const { page, calls } = fakeTable(1000);
    expect(await fetchAllRows(page)).toHaveLength(1000);
    expect(calls).toHaveLength(2);
  });

  it("tabla vacía", async () => {
    const { page } = fakeTable(0);
    expect(await fetchAllRows(page)).toEqual([]);
  });

  it("propaga errores en vez de devolver datos incompletos", async () => {
    await expect(fetchAllRows(async () => ({ data: null, error: { message: "boom" } }))).rejects.toThrow("boom");
  });
});
