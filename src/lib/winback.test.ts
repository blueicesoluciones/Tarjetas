import { describe, expect, it } from "vitest";
import { needsWinback } from "./winback";

const now = new Date("2026-10-14T15:00:00Z");
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString();

describe("needsWinback", () => {
  it("avisa a quien lleva los días configurados sin venir", () => {
    expect(needsWinback({ last_stamp_at: daysAgo(31), winback_sent_at: null }, 30, now)).toBe(true);
    expect(needsWinback({ last_stamp_at: daysAgo(10), winback_sent_at: null }, 30, now)).toBe(false);
  });
  it("no repite el aviso en la misma ausencia", () => {
    expect(needsWinback({ last_stamp_at: daysAgo(40), winback_sent_at: daysAgo(5) }, 30, now)).toBe(false);
  });
  it("vuelve a avisar si regresó y otra vez dejó de venir", () => {
    expect(needsWinback({ last_stamp_at: daysAgo(35), winback_sent_at: daysAgo(80) }, 30, now)).toBe(true);
  });
});
