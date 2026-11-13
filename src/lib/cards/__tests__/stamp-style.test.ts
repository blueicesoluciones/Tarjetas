import { describe, expect, it } from "vitest";
import { DEFAULT_STAMP_STYLE, resolveStampStyle } from "../stamp-style";

describe("resolveStampStyle", () => {
  it("usa el chulo si el plan no lo incluye", () => {
    expect(resolveStampStyle(false, "heart", null)).toEqual(DEFAULT_STAMP_STYLE);
    expect(resolveStampStyle(false, "image", "https://x/y.png")).toEqual(DEFAULT_STAMP_STYLE);
  });
  it("respeta el ícono elegido", () => {
    expect(resolveStampStyle(true, "star", null)).toEqual({ icon: "star", imageUrl: null });
  });
  it("usa la imagen solo si está guardada", () => {
    expect(resolveStampStyle(true, "image", "https://x/y.png")).toEqual({ icon: "check", imageUrl: "https://x/y.png" });
    expect(resolveStampStyle(true, "image", null)).toEqual(DEFAULT_STAMP_STYLE);
  });
  it("ignora valores desconocidos", () => {
    expect(resolveStampStyle(true, "rocket", null)).toEqual(DEFAULT_STAMP_STYLE);
  });
});
