import { describe, expect, it } from "vitest";
import { birthdaySchema, birthdaysOn, formatBirthday, isValidBirthday } from "../birthday";

describe("isValidBirthday", () => {
  it("acepta fechas reales sin año, incluido el 29 de febrero", () => {
    expect(isValidBirthday(1, 31)).toBe(true);
    expect(isValidBirthday(2, 29)).toBe(true);
    expect(isValidBirthday(12, 1)).toBe(true);
  });
  it("rechaza fechas que no existen", () => {
    expect(isValidBirthday(2, 30)).toBe(false);
    expect(isValidBirthday(4, 31)).toBe(false);
    expect(isValidBirthday(13, 1)).toBe(false);
    expect(isValidBirthday(0, 10)).toBe(false);
  });
});

describe("birthdaysOn", () => {
  it("devuelve el mes y día de la fecha", () => {
    expect(birthdaysOn("2026-10-19")).toEqual([{ month: 10, day: 19 }]);
  });
  it("incluye el 29 de febrero el 28 en años no bisiestos", () => {
    expect(birthdaysOn("2027-02-28")).toEqual([
      { month: 2, day: 28 },
      { month: 2, day: 29 },
    ]);
    expect(birthdaysOn("2028-02-28")).toEqual([{ month: 2, day: 28 }]);
  });
});

describe("birthdaySchema", () => {
  it("convierte los valores del formulario", () => {
    expect(birthdaySchema.parse({ birthMonth: "3", birthDay: "14" })).toEqual({ birthMonth: 3, birthDay: 14 });
  });
  it("rechaza vacíos y fechas imposibles", () => {
    expect(birthdaySchema.safeParse({ birthMonth: "", birthDay: "" }).success).toBe(false);
    expect(birthdaySchema.safeParse({ birthMonth: "2", birthDay: "31" }).success).toBe(false);
  });
});

it("formatBirthday", () => {
  expect(formatBirthday(3, 14)).toBe("14 de marzo");
});
