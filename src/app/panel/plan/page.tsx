import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check, Mail, MessageCircle, Minus } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBusinessWithProgram } from "@/lib/auth/business";
import { requireStaff } from "@/lib/auth/staff";
import { LEGAL } from "@/lib/legal";
import { PLAN_ORDER, PLANS, planFeatures, type PlanFeatures } from "@/lib/plans";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Mi plan" };

/** Comparación de planes: true/false se muestran como incluido / no incluido. */
const PLAN_ROWS: { label: string; value: (f: PlanFeatures) => string | boolean }[] = [
  { label: "Tarjeta web, Google Wallet y Apple Wallet", value: () => true },
  { label: "App del cajero, QR y afiche para compartir", value: () => true },
  { label: "Avisos automáticos («¡Te falta 1 sello!», «¡Premio disponible!»)", value: () => true },
  { label: "Cajeros además del dueño", value: (f) => (f.maxCashiers === null ? "Ilimitados" : String(f.maxCashiers)) },
  { label: "Fondo de la tarjeta", value: (f) => (f.backgroundImage ? "Con imagen" : "Color sólido") },
  { label: "Premios en el camino (ej. a los 5 y a los 10 sellos)", value: (f) => f.milestoneRewards },
  {
    label: "Campañas por Wallet",
    value: (f) => (f.campaignsPerMonth === null ? "Sin límite" : f.campaignsPerMonth > 0 ? `${f.campaignsPerMonth} al mes` : false),
  },
  { label: "Exportar clientes a Excel", value: (f) => f.csvExport },
  {
    label: "Métricas del panel",
    value: (f) => (f.metrics === "basic" ? "Básicas" : f.metrics === "advanced" ? "Detalladas" : "Completas y gráficos"),
  },
  { label: "Aviso automático «Te extrañamos»", value: (f) => f.winback },
  { label: "Reporte mensual", value: (f) => f.monthlyReport },
  { label: "Varias sedes, con cajeros y logo por sede", value: (f) => f.multiBranch },
  { label: "Soporte", value: (f) => (f.support === "whatsapp" ? "WhatsApp prioritario" : "Correo") },
];

export default async function PlanPage() {
  const ctx = await requireStaff(["owner"], { needsBusiness: true });
  const { business } = await getBusinessWithProgram(ctx.businessId!);
  if (!business) notFound();
  const current = business.plan;
  const f = planFeatures(current);
  const whatsapp = f.support === "whatsapp" && LEGAL.supportWhatsapp ? LEGAL.supportWhatsapp.replace(/\D/g, "") : null;

  return (
    <>
      <PageHeader title="Mi plan" description={`${business.name} tiene el plan ${f.label}.`} />

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[34rem] text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-4 text-left font-medium text-muted-foreground">Incluye</th>
              {PLAN_ORDER.map((p) => (
                <th key={p} scope="col" className={cn("w-[18%] p-4 text-center", p === current && "bg-lime/40")}>
                  <span className="block text-base font-semibold">{PLANS[p].label}</span>
                  {p === current ? <span className="text-xs font-medium">Tu plan</span> : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PLAN_ROWS.map((row) => (
              <tr key={row.label} className="border-b last:border-0">
                <th scope="row" className="p-4 text-left font-normal">
                  {row.label}
                </th>
                {PLAN_ORDER.map((p) => {
                  const value = row.value(PLANS[p]);
                  return (
                    <td key={p} className={cn("p-4 text-center", p === current && "bg-lime/15 font-medium")}>
                      {value === true ? (
                        <Check className="mx-auto size-4" aria-label="Incluido" />
                      ) : value === false ? (
                        <Minus className="mx-auto size-4 text-muted-foreground/60" aria-label="No incluido" />
                      ) : (
                        value
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Soporte y cambios de plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Para subir de plan, agregar cajeros o resolver cualquier duda, escríbenos.
          </p>
          <div className="flex flex-wrap gap-3">
            {whatsapp ? (
              <a
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 font-medium text-paper"
              >
                <MessageCircle className="size-4" /> Soporte prioritario por WhatsApp
              </a>
            ) : null}
            <a
              href={`mailto:${LEGAL.email}?subject=${encodeURIComponent(`Soporte ${business.name}`)}`}
              className="inline-flex items-center gap-2 rounded-full border px-4 py-2 font-medium"
            >
              <Mail className="size-4" /> {LEGAL.email}
            </a>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
