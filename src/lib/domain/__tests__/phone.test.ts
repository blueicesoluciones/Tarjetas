import { describe, expect, it } from "vitest";
import { normalizePhone } from "../phone";

describe("normalizePhone", () => {
  it("normaliza números locales con el país por defecto", () => {
    expect(normalizePhone("9 1234 5678", "CL")).toBe("+56912345678");
    expect(normalizePhone("300 123 4567", "CO")).toBe("+573001234567");
  });
  it("respeta el prefijo internacional explícito", () => {
    expect(normalizePhone("+57 300 123 4567", "CL")).toBe("+573001234567");
  });
  it("rechaza números inválidos", () => {
    expect(normalizePhone("123", "CL")).toBeNull();
    expect(normalizePhone("", "CL")).toBeNull();
    expect(normalizePhone("hola", "CL")).toBeNull();
  });
});
