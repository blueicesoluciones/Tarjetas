/**
 * Planes de stamp y lo que incluye cada uno. Fuente única de verdad para los
 * límites: se aplican en el servidor y la interfaz los usa para mostrar
 * candados y avisos de «Disponible en el plan X».
 */
export type Plan = "standard" | "medium" | "pro";

export type MetricsLevel = "basic" | "advanced" | "full";

export interface PlanFeatures {
  label: string;
  /** Cajeros activos permitidos (además del dueño). null = ilimitados. */
  maxCashiers: number | null;
  /** Fondo de tarjeta con imagen (si no, solo color sólido). */
  backgroundImage: boolean;
  /** Premios intermedios en la misma tarjeta (ej. 5 sellos y 10 sellos). Igual en la migración 08. */
  milestoneRewards: boolean;
  /** Campañas por Wallet por mes calendario. 0 = no incluye, null = sin límite. */
  campaignsPerMonth: number | null;
  /** Exportar clientes a CSV. */
  csvExport: boolean;
  /** Nivel de métricas del panel. */
  metrics: MetricsLevel;
  /** Aviso automático «Te extrañamos». */
  winback: boolean;
  /** Reporte mensual en el panel. */
  monthlyReport: boolean;
  /** Canal de soporte. */
  support: "email" | "whatsapp";
}

export const PLANS: Record<Plan, PlanFeatures> = {
  standard: {
    label: "Standard",
    maxCashiers: 2,
    backgroundImage: false,
    milestoneRewards: false,
    campaignsPerMonth: 0,
    csvExport: false,
    metrics: "basic",
    winback: false,
    monthlyReport: false,
    support: "email",
  },
  medium: {
    label: "Medium",
    maxCashiers: 5,
    backgroundImage: true,
    milestoneRewards: true,
    campaignsPerMonth: 3,
    csvExport: true,
    metrics: "advanced",
    winback: false,
    monthlyReport: false,
    support: "email",
  },
  pro: {
    label: "Pro",
    maxCashiers: null,
    backgroundImage: true,
    milestoneRewards: true,
    campaignsPerMonth: null,
    csvExport: true,
    metrics: "full",
    winback: true,
    monthlyReport: true,
    support: "whatsapp",
  },
};

export const PLAN_ORDER: Plan[] = ["standard", "medium", "pro"];

export function planFeatures(plan: Plan | null | undefined): PlanFeatures {
  return PLANS[plan ?? "standard"] ?? PLANS.standard;
}

/** Primer plan que incluye una función (para el aviso «Disponible en el plan X»). */
export function minPlanFor(check: (f: PlanFeatures) => boolean): Plan {
  return PLAN_ORDER.find((p) => check(PLANS[p])) ?? "pro";
}

export function canAddCashier(plan: Plan, activeCashiers: number): boolean {
  const max = planFeatures(plan).maxCashiers;
  return max === null || activeCashiers < max;
}

export function campaignsLeft(plan: Plan, sentThisMonth: number): number | null {
  const limit = planFeatures(plan).campaignsPerMonth;
  if (limit === null) return null;
  return Math.max(0, limit - sentThisMonth);
}

/** Lista legible de lo que incluye un plan (para la pestaña «Mi plan» y el admin). */
export function planHighlights(plan: Plan): string[] {
  const f = planFeatures(plan);
  return [
    "Tarjetas en web, Google Wallet y Apple Wallet",
    "Programa de sellos, app del cajero y QR para compartir",
    f.maxCashiers === null ? "Cajeros ilimitados" : `Dueño + ${f.maxCashiers} cajeros`,
    f.backgroundImage ? "Fondo de tarjeta con imagen" : "Logo y colores (fondo sólido)",
    f.milestoneRewards ? "Varios premios en la misma tarjeta (ej. a los 5 y a los 10 sellos)" : "",
    'Avisos automáticos en Wallet ("¡Te falta 1 sello!", "¡Premio disponible!")',
    f.campaignsPerMonth === null
      ? "Campañas por Wallet sin límite mensual"
      : f.campaignsPerMonth > 0
        ? `${f.campaignsPerMonth} campañas por Wallet al mes`
        : "",
    f.csvExport ? "Exportar clientes a Excel (CSV)" : "",
    f.metrics === "basic" ? "Panel con información básica" : f.metrics === "advanced" ? "Métricas detalladas" : "Métricas completas y gráficos",
    f.winback ? 'Aviso automático "Te extrañamos"' : "",
    f.monthlyReport ? "Reporte mensual" : "",
    f.support === "whatsapp" ? "Soporte prioritario por WhatsApp" : "Soporte por correo",
  ].filter(Boolean);
}
