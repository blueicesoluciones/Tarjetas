/**
 * Dominios de stamp. Sin "server-only": también lo usa next.config.ts.
 *
 * LEGACY_HOSTS: direcciones anteriores. Siguen activas solo para la API (los
 * pases de Apple ya emitidos tienen ahí su webServiceURL y Google aún puede
 * pedir imágenes); las páginas redirigen al dominio principal. Cuando el panel
 * de super admin muestre 0 iPhones en la dirección vieja, se puede quitar el
 * dominio de Vercel y de esta lista.
 */
export const PRIMARY_HOST = "stamp.blueicesoluciones.com";
export const LEGACY_HOSTS = ["tarjetas-neon.vercel.app"];

/** Auditoría: un iPhone consultó su pase por la dirección vieja. */
export const LEGACY_APPLE_ACTION = "wallet.apple_legacy_host";

/** Acción de auditoría de «Actualizar todas las tarjetas». */
export const RESYNC_ALL_ACTION = "wallet.resync_all";

/** Host público de la petición (en Vercel llega en x-forwarded-host). */
export function requestHost(request: Request): string {
  const raw = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const host = raw.split(",")[0].trim().toLowerCase().replace(/:\d+$/, "");
  // Solo caracteres de dominio: se usa en filtros de consulta.
  return /^[a-z0-9.-]{1,253}$/.test(host) ? host : "unknown";
}
