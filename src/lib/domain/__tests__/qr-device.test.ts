import { describe, expect, it } from "vitest";
import { encodeCardQr, parseCardQr } from "../qr";
import { detectDevice } from "../device";
import { newAccessToken, newPublicCode } from "../tokens";

describe("QR", () => {
  it("ida y vuelta", () => {
    const code = newPublicCode();
    expect(parseCardQr(encodeCardQr(code))).toBe(code);
  });
  it("rechaza otros formatos", () => {
    expect(parseCardQr("https://example.com")).toBeNull();
    expect(parseCardQr("LC2:ABCDEFGHJKLMNPQR")).toBeNull();
    expect(parseCardQr("LC1:abc")).toBeNull();
    expect(parseCardQr("LC1:ABCD EFGH JKLM")).toBeNull();
  });
});

describe("tokens", () => {
  it("access_token ≥32 caracteres URL-safe", () => {
    const t = newAccessToken();
    expect(t.length).toBeGreaterThanOrEqual(32);
    expect(t).toMatch(/^[A-Za-z0-9]+$/);
  });
});

describe("detectDevice", () => {
  it("detecta iPhone e Instagram", () => {
    const d = detectDevice(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 300.0",
    );
    expect(d).toEqual({ platform: "ios", inAppBrowser: "Instagram" });
  });
  it("detecta Android con Chrome", () => {
    const d = detectDevice("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36");
    expect(d).toEqual({ platform: "android", inAppBrowser: null });
  });
  it("escritorio", () => {
    expect(detectDevice("Mozilla/5.0 (Windows NT 10.0; Win64; x64)").platform).toBe("desktop");
  });
});
