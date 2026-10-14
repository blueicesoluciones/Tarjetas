import { describe, expect, it } from "vitest";
import { campaignsLeft, canAddCashier, minPlanFor, planFeatures } from "./plans";

describe("planes", () => {
  it("límite de cajeros por plan", () => {
    expect(canAddCashier("standard", 1)).toBe(true);
    expect(canAddCashier("standard", 2)).toBe(false);
    expect(canAddCashier("medium", 4)).toBe(true);
    expect(canAddCashier("medium", 5)).toBe(false);
    expect(canAddCashier("pro", 500)).toBe(true);
  });
  it("campañas restantes en el mes", () => {
    expect(campaignsLeft("standard", 0)).toBe(0);
    expect(campaignsLeft("medium", 2)).toBe(1);
    expect(campaignsLeft("medium", 5)).toBe(0);
    expect(campaignsLeft("pro", 40)).toBeNull();
  });
  it("plan mínimo para cada función", () => {
    expect(minPlanFor((f) => f.backgroundImage)).toBe("medium");
    expect(minPlanFor((f) => f.winback)).toBe("pro");
    expect(minPlanFor((f) => f.csvExport)).toBe("medium");
  });
  it("plan desconocido cae en standard", () => {
    expect(planFeatures(undefined).label).toBe("Standard");
  });
});
