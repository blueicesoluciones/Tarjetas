/** Traduce errores lanzados por las funciones Postgres a mensajes en español. */
export interface DbErrorLike {
  message: string;
  details?: string | null;
  code?: string;
}

const MESSAGES: Record<string, string> = {
  NOT_AUTHORIZED: "No tienes permiso para esta acción",
  CARD_NOT_FOUND: "Tarjeta no encontrada",
  BUSINESS_SUSPENDED: "Este negocio está suspendido y no acepta sellos",
  CARD_BLOCKED: "Esta tarjeta está bloqueada",
  REWARD_NOT_AVAILABLE: "La tarjeta aún no tiene el premio disponible",
  NOTE_REQUIRED: "El motivo es obligatorio",
  INVALID_DELTA: "Cantidad de sellos inválida",
  EVENT_NOT_FOUND: "Movimiento no encontrado",
  UNDO_NOT_ALLOWED: "Este movimiento no se puede deshacer",
  ALREADY_UNDONE: "Este sello ya fue deshecho",
  UNDO_WINDOW_EXPIRED: "Ya pasó el tiempo para deshacer este sello",
  UNDO_NOT_LATEST: "Solo se puede deshacer el último movimiento de la tarjeta",
  BUSINESS_REQUIRED: "Selecciona un negocio",
};

export interface StampError {
  code: string;
  message: string;
  status: number;
}

export function translateDbError(err: DbErrorLike): StampError {
  const code = err.message;
  if (code === "COOLDOWN_ACTIVE") {
    let minutes = 0;
    try {
      minutes = Number(JSON.parse(err.details ?? "{}").minutes_since ?? 0);
    } catch {
      // detail mal formado: se usa 0
    }
    const when = minutes < 1 ? "hace menos de un minuto" : `hace ${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
    return { code, message: `Esta tarjeta ya recibió un sello ${when}`, status: 409 };
  }
  const message = MESSAGES[code];
  if (!message) return { code: "UNKNOWN", message: "Ocurrió un error, intenta de nuevo", status: 500 };
  const status = code === "NOT_AUTHORIZED" ? 403 : code.endsWith("NOT_FOUND") ? 404 : 409;
  return { code, message, status };
}
