import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("usa ; y BOM, y escapa comillas y separadores", () => {
    const csv = toCsv(["Nombre", "Nota"], [["Ana; Pérez", 'dijo "hola"'], ["Beto", null]]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain('"Ana; Pérez";"dijo ""hola"""');
    expect(csv).toContain("Beto;\r\n");
  });
  it("neutraliza fórmulas", () => {
    expect(toCsv(["x"], [["=SUMA(A1)"]])).toContain("'=SUMA(A1)");
  });
});
