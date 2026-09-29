/** PINs triviales rechazados (CLAUDE.md §6.2). */
const TRIVIAL_PINS = new Set([
  "0000", "1111", "2222", "3333", "4444", "5555", "6666", "7777", "8888", "9999",
  "1234", "4321", "0123", "9876",
]);

export type PinValidationError = "format" | "trivial";

export function validatePin(pin: string): PinValidationError | null {
  if (!/^\d{4}$/.test(pin)) return "format";
  if (TRIVIAL_PINS.has(pin)) return "trivial";
  return null;
}

export const PIN_ERROR_MESSAGES: Record<PinValidationError, string> = {
  format: "El PIN debe tener exactamente 4 dígitos",
  trivial: "Ese PIN es muy fácil de adivinar, elige otro",
};

/** PIN temporal aleatorio de 4 dígitos que no sea trivial. */
export function generateTempPin(randomInt: (max: number) => number): string {
  for (;;) {
    const pin = String(randomInt(10000)).padStart(4, "0");
    if (validatePin(pin) === null) return pin;
  }
}
