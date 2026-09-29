import { describe, expect, it } from "vitest";
import { dayAndWeekStart, startOfLocalDay } from "./format";

describe("fechas en zona del negocio", () => {
  it("medianoche en Santiago (UTC-3 en verano)", () => {
    expect(startOfLocalDay("2026-01-15", "America/Santiago").toISOString()).toBe("2026-01-15T03:00:00.000Z");
  });
  it("medianoche en Bogotá (UTC-5)", () => {
    expect(startOfLocalDay("2026-06-01", "America/Bogota").toISOString()).toBe("2026-06-01T05:00:00.000Z");
  });
  it("la semana empieza el lunes", () => {
    // Jueves 2026-01-15 14:00 UTC → lunes 12
    const { weekStart } = dayAndWeekStart("America/Bogota", new Date("2026-01-15T14:00:00Z"));
    expect(weekStart.toISOString()).toBe("2026-01-12T05:00:00.000Z");
  });
});
