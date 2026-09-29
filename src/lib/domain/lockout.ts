/** Reglas de bloqueo de PIN (CLAUDE.md §7.2). */
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;
export const MAX_LOCKOUTS = 3;

export interface PinLockState {
  pinFailedAttempts: number;
  pinLockedUntil: Date | null;
  pinLockoutCount: number;
}

export type LockStatus =
  | { kind: "ok" }
  | { kind: "locked"; until: Date }
  | { kind: "locked_permanently" };

export function getLockStatus(state: PinLockState, now: Date): LockStatus {
  if (state.pinLockoutCount >= MAX_LOCKOUTS) return { kind: "locked_permanently" };
  if (state.pinLockedUntil && state.pinLockedUntil > now) {
    return { kind: "locked", until: state.pinLockedUntil };
  }
  return { kind: "ok" };
}

/** Nuevo estado tras un intento fallido. */
export function registerFailedAttempt(state: PinLockState, now: Date): PinLockState {
  // Si un bloqueo anterior ya venció, el contador arranca de nuevo.
  const attempts = state.pinFailedAttempts + 1;
  if (attempts >= MAX_FAILED_ATTEMPTS) {
    return {
      pinFailedAttempts: 0,
      pinLockedUntil: new Date(now.getTime() + LOCK_MINUTES * 60_000),
      pinLockoutCount: state.pinLockoutCount + 1,
    };
  }
  return { ...state, pinFailedAttempts: attempts };
}

/** Estado tras un ingreso correcto. El conteo de bloqueos acumulados se conserva. */
export function registerSuccess(state: PinLockState): PinLockState {
  return { ...state, pinFailedAttempts: 0, pinLockedUntil: null };
}

/** Estado tras un restablecimiento de PIN por el owner. */
export function resetLockState(): PinLockState {
  return { pinFailedAttempts: 0, pinLockedUntil: null, pinLockoutCount: 0 };
}
