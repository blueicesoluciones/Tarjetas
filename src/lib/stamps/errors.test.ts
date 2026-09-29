import { describe, expect, it } from "vitest";
import { translateDbError } from "./errors";

describe("translateDbError", () => {
  it("traduce el cooldown con minutos", () => {
    const e = translateDbError({ message: "COOLDOWN_ACTIVE", details: '{"minutes_since": 12, "cooldown_minutes": 60}' });
    expect(e.message).toBe("Esta tarjeta ya recibió un sello hace 12 minutos");
    expect(e.status).toBe(409);
  });
  it("errores desconocidos son genéricos", () => {
    expect(translateDbError({ message: "boom" }).code).toBe("UNKNOWN");
  });
  it("NOT_AUTHORIZED es 403", () => {
    expect(translateDbError({ message: "NOT_AUTHORIZED" }).status).toBe(403);
  });
});
