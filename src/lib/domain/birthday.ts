import { z } from "zod";

/** Cumpleaños del cliente: solo mes y día, sin año. */

export const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

/** Aviso de Wallet que pide el cumpleaños a los clientes inscritos antes de pedirlo. */
export const BIRTHDAY_REMINDER_TITLE = "Actualiza tu información";
export const BIRTHDAY_REMINDER_BODY = "Cuéntanos cuándo cumples años: en los detalles de tu tarjeta toca «Agregar mi cumpleaños».";

/** Días del mes sin año: febrero admite el 29. */
export function daysInMonth(month: number): number {
  if (month === 2) return 29;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export function isValidBirthday(month: number, day: number): boolean {
  return Number.isInteger(month) && Number.isInteger(day) && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(month);
}

/** «14 de marzo». */
export function formatBirthday(month: number, day: number): string {
  return `${day} de ${MONTHS[month - 1]}`;
}

function isLeapYear(year: number) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Cumpleaños que se celebran en una fecha local (YYYY-MM-DD). En años no
 * bisiestos, quien nació el 29 de febrero aparece el 28.
 */
export function birthdaysOn(ymd: string): { month: number; day: number }[] {
  const [year, month, day] = ymd.split("-").map(Number);
  const list = [{ month, day }];
  if (month === 2 && day === 28 && !isLeapYear(year)) list.push({ month: 2, day: 29 });
  return list;
}

/** Campos «mes» y «día» de un formulario (selects, llegan como texto). */
export const birthdaySchema = z
  .object({
    birthMonth: z.coerce.number({ message: "Elige el mes" }).int().min(1, "Elige el mes").max(12, "Elige el mes"),
    birthDay: z.coerce.number({ message: "Elige el día" }).int().min(1, "Elige el día").max(31, "Elige el día"),
  })
  .refine((d) => isValidBirthday(d.birthMonth, d.birthDay), {
    message: "Esa fecha no existe",
    path: ["birthDay"],
  });
