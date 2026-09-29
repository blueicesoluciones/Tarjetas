import { describe, expect, it } from "vitest";
import {
  LOCK_MINUTES,
  getLockStatus,
  registerFailedAttempt,
  registerSuccess,
  type PinLockState,
} from "../lockout";

const now = new Date("2026-01-01T12:00:00Z");
const clean: PinLockState = { pinFailedAttempts: 0, pinLockedUntil: null, pinLockoutCount: 0 };

function fail(state: PinLockState, times: number, at = now) {
  let s = state;
  for (let i = 0; i < times; i++) s = registerFailedAttempt(s, at);
  return s;
}

describe("bloqueo de PIN", () => {
  it("4 intentos fallidos no bloquean", () => {
    const s = fail(clean, 4);
    expect(getLockStatus(s, now).kind).toBe("ok");
    expect(s.pinFailedAttempts).toBe(4);
  });

  it("5 intentos fallidos bloquean 15 minutos", () => {
    const s = fail(clean, 5);
    const status = getLockStatus(s, now);
    expect(status.kind).toBe("locked");
    expect(s.pinLockoutCount).toBe(1);
    const after = new Date(now.getTime() + LOCK_MINUTES * 60_000 + 1);
    expect(getLockStatus(s, after).kind).toBe("ok");
  });

  it("3 bloqueos acumulados bloquean indefinidamente", () => {
    let s = clean;
    let t = now;
    for (let i = 0; i < 3; i++) {
      s = fail(s, 5, t);
      t = new Date(t.getTime() + 60 * 60_000);
    }
    expect(getLockStatus(s, t).kind).toBe("locked_permanently");
  });

  it("acertar reinicia los intentos pero conserva los bloqueos acumulados", () => {
    const s = registerSuccess({ pinFailedAttempts: 3, pinLockedUntil: null, pinLockoutCount: 2 });
    expect(s.pinFailedAttempts).toBe(0);
    expect(s.pinLockoutCount).toBe(2);
  });
});
