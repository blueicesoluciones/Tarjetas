import { describe, expect, it } from "vitest";
import { normalizePhone } from "../phone";

describe("normalizePhone", () => {
  it("Colombia: acepta 10 dígitos con o sin espacios", () => {
    expect(normalizePhone("3211231234", "CO")).toBe("+573211231234");
    expect(normalizePhone("321 123 1234", "CO")).toBe("+573211231234");
    expect(normalizePhone("321-123-1234", "CO")).toBe("+573211231234");
    expect(normalizePhone("(321) 123 1234", "CO")).toBe("+573211231234");
  });
  it("Colombia: acepta el indicativo con o sin +", () => {
    expect(normalizePhone("+57 321 123 1234", "CO")).toBe("+573211231234");
    expect(normalizePhone("57 321 123 1234", "CO")).toBe("+573211231234");
    expect(normalizePhone("573211231234", "CO")).toBe("+573211231234");
  });
  it("otros países por defecto del negocio", () => {
    expect(normalizePhone("9 1234 5678", "CL")).toBe("+56912345678");
    expect(normalizePhone("+57 300 123 4567", "CL")).toBe("+573001234567");
  });
  it("rechaza números inválidos", () => {
    expect(normalizePhone("321 123", "CO")).toBeNull();
    expect(normalizePhone("", "CO")).toBeNull();
    expect(normalizePhone("hola", "CO")).toBeNull();
    expect(normalizePhone("123", "CL")).toBeNull();
  });
});
