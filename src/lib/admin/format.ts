const dateTime = new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
const dateOnly = new Intl.DateTimeFormat("es", { dateStyle: "medium", timeZone: "UTC" });

/** Fechas del panel global en UTC (no hay zona horaria de negocio común). */
export function formatDateTime(iso: string) {
  return `${dateTime.format(new Date(iso))} UTC`;
}

export function formatDate(iso: string) {
  return dateOnly.format(new Date(iso));
}
