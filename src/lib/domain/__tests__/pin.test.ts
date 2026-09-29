import { describe, expect, it } from "vitest";
import { generateTempPin, validatePin } from "../pin";

describe("validatePin", () => {
  it("acepta 4 dígitos no triviales", () => {
    expect(validatePin("2580")).toBeNull();
    expect(validatePin("0417")).toBeNull();
  });
  it("rechaza formatos inválidos", () => {
    for (const pin of ["", "123", "12345", "12a4", " 1234", "１２３４"]) {
      expect(validatePin(pin)).toBe("format");
    }
  });
  it("rechaza PIN triviales", () => {
    for (const pin of ["0000", "1111", "9999", "1234", "4321", "0123", "9876"]) {
      expect(validatePin(pin)).toBe("trivial");
    }
  });
});

describe("generateTempPin", () => {
  it("nunca genera un PIN trivial", () => {
    const seq = [1111, 1234, 42];
    let i = 0;
    const pin = generateTempPin(() => seq[i++]);
    expect(pin).toBe("0042");
  });
});
