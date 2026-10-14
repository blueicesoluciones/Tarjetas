import { describe, expect, it } from "vitest";
import { bestWeekday, bucketByLocalDay, changeLabel, lastNDays, monthRange, pctChange, percent } from "./metrics";

describe("métricas", () => {
  it("variación porcentual", () => {
    expect(pctChange(12, 10)).toBe(20);
    expect(pctChange(5, 10)).toBe(-50);
    expect(pctChange(3, 0)).toBeNull();
  });
  it("texto de comparación", () => {
    expect(changeLabel(12, 10, "la semana anterior")).toBe("+20% vs la semana anterior");
    expect(changeLabel(10, 10, "la semana anterior")).toBe("Igual que la semana anterior");
    expect(changeLabel(4, 0, "la semana anterior")).toBe("Sin datos de la semana anterior para comparar");
  });
  it("porcentaje seguro", () => {
    expect(percent(1, 3)).toBe(33);
    expect(percent(5, 0)).toBe(0);
  });
  it("últimos días y agrupación por día local (Bogotá, UTC-5)", () => {
    const days = lastNDays("2026-10-14", 3);
    expect(days).toEqual(["2026-10-12", "2026-10-13", "2026-10-14"]);
    // 2026-10-14T03:00Z es 13 de octubre a las 22:00 en Bogotá.
    const counts = bucketByLocalDay(["2026-10-14T03:00:00Z", "2026-10-14T15:00:00Z", "2026-10-01T15:00:00Z"], "America/Bogota", days);
    expect(counts).toEqual([0, 1, 1]);
  });
  it("día con más visitas", () => {
    // 2026-10-13 y 2026-10-20 son martes (mediodía Bogotá).
    expect(bestWeekday(["2026-10-13T17:00:00Z", "2026-10-20T17:00:00Z", "2026-10-14T17:00:00Z"], "America/Bogota")).toEqual({
      day: "martes",
      count: 2,
    });
    expect(bestWeekday([], "America/Bogota")).toBeNull();
  });
  it("rango de mes en la zona del negocio", () => {
    const r = monthRange("2026-10", "America/Bogota");
    expect(r.start.toISOString()).toBe("2026-10-01T05:00:00.000Z");
    expect(r.end.toISOString()).toBe("2026-11-01T05:00:00.000Z");
    expect(r.prevKey).toBe("2026-09");
    expect(r.nextKey).toBe("2026-11");
    expect(r.label).toBe("Octubre de 2026");
    expect(monthRange("basura", "America/Bogota", new Date("2026-10-14T12:00:00Z")).key).toBe("2026-10");
  });
});
