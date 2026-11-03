import { describe, expect, it } from "vitest";
import { stampBranchSequence, type StampEventLite } from "../stamp-branches";

const stamp = (branch: string | null, after: number, undone = false): StampEventLite => ({
  type: "stamp",
  delta: 1,
  stamps_after: after,
  branch_id: branch,
  undone_at: undone ? "2026-11-03T00:00:00Z" : null,
});

describe("stampBranchSequence", () => {
  it("guarda la sede de cada sello en orden", () => {
    expect(stampBranchSequence([stamp("A", 1), stamp("B", 2), stamp(null, 3)], 3)).toEqual(["A", "B", null]);
  });

  it("ignora los sellos deshechos", () => {
    const events: StampEventLite[] = [
      stamp("A", 1),
      stamp("B", 2, true),
      { type: "undo", delta: -1, stamps_after: 1, branch_id: "B", undone_at: null },
      stamp("C", 2),
    ];
    expect(stampBranchSequence(events, 2)).toEqual(["A", "C"]);
  });

  it("el canje gasta los sellos más antiguos y los sobrantes conservan su sede", () => {
    const events: StampEventLite[] = [
      stamp("A", 1),
      stamp("A", 2),
      stamp("B", 3),
      { type: "redeem", delta: -2, stamps_after: 1, branch_id: "B", undone_at: null },
      stamp("C", 2),
    ];
    expect(stampBranchSequence(events, 2)).toEqual(["B", "C"]);
  });

  it("el premio intermedio no cambia los sellos", () => {
    const events: StampEventLite[] = [stamp("A", 1), { type: "redeem", delta: 0, stamps_after: 1, branch_id: "A", undone_at: null }];
    expect(stampBranchSequence(events, 1)).toEqual(["A"]);
  });

  it("los ajustes manuales suman sellos sin sede o quitan los últimos", () => {
    const events: StampEventLite[] = [
      stamp("A", 1),
      { type: "manual_adjust", delta: 2, stamps_after: 3, branch_id: null, undone_at: null },
      { type: "manual_adjust", delta: -1, stamps_after: 2, branch_id: null, undone_at: null },
    ];
    expect(stampBranchSequence(events, 2)).toEqual(["A", null]);
  });

  it("si el historial no cuadra con el contador, completa con sellos sin sede", () => {
    expect(stampBranchSequence([stamp("A", 1)], 3)).toEqual(["A", null, null]);
    expect(stampBranchSequence([], 0)).toEqual([]);
  });
});
