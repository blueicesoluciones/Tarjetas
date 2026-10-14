import { addDays, localDateString, startOfLocalDay } from "./format";

/** Variación porcentual; null si no hay base de comparación (anterior = 0). */
export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** Texto de comparación: "+12% vs semana anterior", "Igual que la semana anterior", etc. */
export function changeLabel(current: number, previous: number, period: string): string {
  const pct = pctChange(current, previous);
  if (pct === null) return current === 0 ? `Sin movimiento ni ${period} ni ahora` : `Sin datos de ${period} para comparar`;
  if (pct === 0) return `Igual que ${period}`;
  return `${pct > 0 ? "+" : ""}${pct}% vs ${period}`;
}

/** Porcentaje entero de una parte sobre un total (0 si el total es 0). */
export function percent(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

/** Fechas locales (YYYY-MM-DD) de los últimos `n` días terminando en `todayYmd`. */
export function lastNDays(todayYmd: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addDays(todayYmd, i - (n - 1)));
}

/** Cuenta instantes por día local, en el orden de `days`. */
export function bucketByLocalDay(isoDates: string[], timeZone: string, days: string[]): number[] {
  const counts = new Map(days.map((d) => [d, 0]));
  for (const iso of isoDates) {
    const day = localDateString(new Date(iso), timeZone);
    if (counts.has(day)) counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return days.map((d) => counts.get(d) ?? 0);
}

export const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/** Día de la semana (local) con más eventos; null si no hay eventos. */
export function bestWeekday(isoDates: string[], timeZone: string): { day: string; count: number } | null {
  if (isoDates.length === 0) return null;
  const counts = new Array<number>(7).fill(0);
  for (const iso of isoDates) {
    const [y, m, d] = localDateString(new Date(iso), timeZone).split("-").map(Number);
    counts[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]++;
  }
  const max = Math.max(...counts);
  return { day: WEEKDAYS[counts.indexOf(max)], count: max };
}

export interface MonthRange {
  /** "YYYY-MM" */
  key: string;
  label: string;
  start: Date;
  end: Date;
  prevKey: string;
  nextKey: string;
}

function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Mes pedido (?mes=YYYY-MM) o el actual en la zona del negocio, con sus límites en UTC. */
export function monthRange(param: string | undefined, timeZone: string, now = new Date()): MonthRange {
  const current = localDateString(now, timeZone).slice(0, 7);
  const key = param && /^\d{4}-(0[1-9]|1[0-2])$/.test(param) ? param : current;
  const nextKey = shiftMonth(key, 1);
  const [y, m] = key.split("-").map(Number);
  const label = new Intl.DateTimeFormat("es", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, 1)),
  );
  return {
    key,
    label: label.charAt(0).toUpperCase() + label.slice(1),
    start: startOfLocalDay(`${key}-01`, timeZone),
    end: startOfLocalDay(`${nextKey}-01`, timeZone),
    prevKey: shiftMonth(key, -1),
    nextKey,
  };
}
