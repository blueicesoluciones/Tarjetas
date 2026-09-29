import type { StampEventType } from "@/types/db";

export function formatDateTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("es", { timeZone, dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
}

export function formatDate(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("es", { timeZone, dateStyle: "medium" }).format(new Date(iso));
}

/** Minutos que la zona horaria está adelantada respecto a UTC en ese instante. */
function tzOffsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - date.getTime()) / 60_000);
}

/** Fecha local (YYYY-MM-DD) en la zona horaria. */
export function localDateString(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/** Instante UTC de las 00:00 locales de una fecha YYYY-MM-DD en la zona horaria. */
export function startOfLocalDay(ymd: string, timeZone: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d));
  const offset = tzOffsetMinutes(guess, timeZone);
  const result = new Date(guess.getTime() - offset * 60_000);
  // Corrige si hay cambio de horario entre la suposición y el resultado.
  const offset2 = tzOffsetMinutes(result, timeZone);
  return offset2 === offset ? result : new Date(guess.getTime() - offset2 * 60_000);
}

export function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Inicio de hoy y del lunes de esta semana (en la zona del negocio). */
export function dayAndWeekStart(timeZone: string, now = new Date()) {
  const today = localDateString(now, timeZone);
  const [y, m, d] = today.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = domingo
  const monday = addDays(today, -((weekday + 6) % 7));
  return { dayStart: startOfLocalDay(today, timeZone), weekStart: startOfLocalDay(monday, timeZone) };
}

export const EVENT_LABELS: Record<StampEventType, string> = {
  stamp: "Sello",
  manual_adjust: "Ajuste manual",
  redeem: "Canje",
  undo: "Deshacer",
};

export function formatDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : String(delta);
}

/** Estado de bloqueo del PIN para mostrar en el panel. */
export function pinLockStatus(lockedUntil: string | null, lockoutCount: number, now = new Date()) {
  if (lockoutCount >= 3) return "permanent" as const;
  if (lockedUntil && new Date(lockedUntil) > now) return "temporary" as const;
  return null;
}
