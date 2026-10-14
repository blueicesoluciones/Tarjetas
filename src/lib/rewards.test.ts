import { describe, expect, it } from "vitest";
import { milestoneStatuses, nextGoal, reachedMilestone, validateMilestones } from "./rewards";

const ms = [
  { stampsAt: 8, description: "Bebida" },
  { stampsAt: 5, description: "Descuento" },
];

describe("premios intermedios", () => {
  it("estado según sellos y cobrados", () => {
    const s = milestoneStatuses(ms, 6, []);
    expect(s.map((m) => m.stampsAt)).toEqual([5, 8]);
    expect(s[0]).toMatchObject({ available: true, claimed: false });
    expect(s[1]).toMatchObject({ available: false, claimed: false });
    expect(milestoneStatuses(ms, 6, [5])[0]).toMatchObject({ available: false, claimed: true });
  });
  it("valida rango, duplicados y texto", () => {
    expect(validateMilestones(ms, 10)).toBeNull();
    expect(validateMilestones([{ stampsAt: 10, description: "x" }], 10)).toMatch(/entre 1 y 9/);
    expect(validateMilestones([{ stampsAt: 0, description: "x" }], 10)).toMatch(/entre 1 y 9/);
    expect(validateMilestones([ms[0], { ...ms[0] }], 10)).toMatch(/dos premios/);
    expect(validateMilestones([{ stampsAt: 3, description: "  " }], 10)).toMatch(/Escribe/);
  });
  it("detecta la meta alcanzada con un sello", () => {
    expect(reachedMilestone(ms, 4, 5)?.description).toBe("Descuento");
    expect(reachedMilestone(ms, 5, 6)).toBeUndefined();
    expect(reachedMilestone(ms, 4, 9)?.stampsAt).toBe(8);
  });
  it("próxima meta", () => {
    expect(nextGoal(ms, 2, 10, "Hamburguesa")).toEqual({ stampsAt: 5, description: "Descuento" });
    expect(nextGoal(ms, 8, 10, "Hamburguesa")).toEqual({ stampsAt: 10, description: "Hamburguesa" });
  });
});
