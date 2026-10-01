import { describe, expect, it } from "vitest";
import { normalizePhone } from "../phone";

describe("normalizePhone", () => {
  it("Colombia: acepta 10 dígitos con o sin espacios", () => {
    expect(normalizePhone("3116554177", "CO")).toBe("+573116554177");
    expect(normalizePhone("311 655 4177", "CO")).toBe("+573116554177");
    expect(normalizePhone("311-655-4177", "CO")).toBe("+573116554177");
    expect(normalizePhone("(311) 655 4177", "CO")).toBe("+573116554177");
  });
  it("Colombia: acepta el indicativo con o sin +", () => {
    expect(normalizePhone("+57 311 655 4177", "CO")).toBe("+573116554177");
    expect(normalizePhone("57 311 655 4177", "CO")).toBe("+573116554177");
    expect(normalizePhone("573116554177", "CO")).toBe("+573116554177");
  });
  it("otros países por defecto del negocio", () => {
    expect(normalizePhone("9 1234 5678", "CL")).toBe("+56912345678");
    expect(normalizePhone("+57 300 123 4567", "CL")).toBe("+573001234567");
  });
  it("rechaza números inválidos", () => {
    expect(normalizePhone("311 655", "CO")).toBeNull();
    expect(normalizePhone("", "CO")).toBeNull();
    expect(normalizePhone("hola", "CO")).toBeNull();
    expect(normalizePhone("123", "CL")).toBeNull();
  });
});
