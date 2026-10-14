import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { LockedFeature } from "@/components/panel/locked-feature";
import { PageHeader } from "@/components/panel/page-header";
import { getBusinessWithProgram } from "@/lib/auth/business";
import { requireStaff } from "@/lib/auth/staff";
import { localDateString } from "@/lib/panel/format";
import { changeLabel, monthRange, type MonthRange } from "@/lib/panel/metrics";
import { planFeatures } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Reporte mensual" };

interface MonthStats {
  newCustomers: number;
  stamps: number;
  redemptions: number;
  uniqueVisitors: number;
  returning: number;
}

async function monthStats(businessId: string, range: MonthRange): Promise<MonthStats> {
  const admin = createAdminClient();
  const from = range.start.toISOString();
  const to = range.end.toISOString();

  const [newCustomers, redemptions, stampEvents] = await Promise.all([
    admin
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .gte("created_at", from)
      .lt("created_at", to),
    admin
      .from("stamp_events")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("type", "redeem")
      .is("undone_at", null)
      .gte("created_at", from)
      .lt("created_at", to),
    admin
      .from("stamp_events")
      .select("card_id")
      .eq("business_id", businessId)
      .eq("type", "stamp")
      .is("undone_at", null)
      .gte("created_at", from)
      .lt("created_at", to)
      .limit(20000)
      .returns<{ card_id: string }[]>(),
  ]);

  const visitors = [...new Set((stampEvents.data ?? []).map((e) => e.card_id))];

  // Regresaron: visitaron este mes y ya tenían algún sello antes del mes.
  let returning = 0;
  for (let i = 0; i < visitors.length; i += 200) {
    const chunk = visitors.slice(i, i + 200);
    const { data } = await admin
      .from("stamp_events")
      .select("card_id")
      .eq("business_id", businessId)
      .eq("type", "stamp")
      .is("undone_at", null)
      .lt("created_at", from)
      .in("card_id", chunk)
      .limit(20000)
      .returns<{ card_id: string }[]>();
    returning += new Set((data ?? []).map((e) => e.card_id)).size;
  }

  return {
    newCustomers: newCustomers.count ?? 0,
    stamps: stampEvents.data?.length ?? 0,
    redemptions: redemptions.count ?? 0,
    uniqueVisitors: visitors.length,
    returning,
  };
}

export default async function MonthlyReportPage({ searchParams }: PageProps<"/panel/reporte">) {
  const ctx = await requireStaff(["owner"], { needsBusiness: true });
  const businessId = ctx.businessId!;
  const { business } = await getBusinessWithProgram(businessId);
  const timeZone = business?.timezone ?? "UTC";

  if (!planFeatures(business?.plan).monthlyReport) {
    return (
      <>
        <PageHeader title="Reporte mensual" description="El resumen de cada mes de tu programa de fidelidad." />
        <LockedFeature
          title="Reporte mensual"
          description="Clientes nuevos, sellos, canjes, clientes que visitaron y clientes que regresaron, comparados con el mes anterior."
          plan="pro"
        />
      </>
    );
  }

  const { mes } = await searchParams;
  const range = monthRange(typeof mes === "string" ? mes : undefined, timeZone);
  const prevRange = monthRange(range.prevKey, timeZone);
  const currentKey = localDateString(new Date(), timeZone).slice(0, 7);
  const isCurrent = range.key === currentKey;

  const [stats, prev] = await Promise.all([monthStats(businessId, range), monthStats(businessId, prevRange)]);
  const period = "el mes anterior";

  const rows: { label: string; value: number; previous: number; hint: string }[] = [
    { label: "Clientes nuevos", value: stats.newCustomers, previous: prev.newCustomers, hint: "Se inscribieron en el mes" },
    { label: "Sellos", value: stats.stamps, previous: prev.stamps, hint: "Visitas registradas por el cajero" },
    { label: "Canjes", value: stats.redemptions, previous: prev.redemptions, hint: "Premios entregados" },
    {
      label: "Clientes que visitaron",
      value: stats.uniqueVisitors,
      previous: prev.uniqueVisitors,
      hint: "Clientes distintos con al menos un sello",
    },
    {
      label: "Clientes que regresaron",
      value: stats.returning,
      previous: prev.returning,
      hint: "Ya tenían sellos de antes y volvieron este mes",
    },
  ];

  return (
    <>
      <PageHeader title="Reporte mensual" description={business?.name} />

      <div className="mb-6 flex items-center gap-2 print:hidden">
        <Link
          href={`/panel/reporte?mes=${range.prevKey}`}
          className="inline-flex size-9 items-center justify-center rounded-lg border hover:bg-muted"
          aria-label="Mes anterior"
        >
          <ChevronLeft className="size-4" />
        </Link>
        <p className="min-w-44 text-center text-lg font-semibold">{range.label}</p>
        {isCurrent ? (
          <span className="inline-flex size-9 items-center justify-center rounded-lg border opacity-40" aria-hidden>
            <ChevronRight className="size-4" />
          </span>
        ) : (
          <Link
            href={`/panel/reporte?mes=${range.nextKey}`}
            className="inline-flex size-9 items-center justify-center rounded-lg border hover:bg-muted"
            aria-label="Mes siguiente"
          >
            <ChevronRight className="size-4" />
          </Link>
        )}
        {isCurrent ? <span className="ml-2 text-sm text-muted-foreground">Mes en curso</span> : null}
      </div>
      <p className="mb-4 hidden text-lg font-semibold print:block">{range.label}</p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => (
          <div key={r.label} className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">{r.label}</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">{r.value.toLocaleString("es")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{r.hint}</p>
            <p className="mt-3 border-t pt-2 text-xs">
              <span className="font-medium">{changeLabel(r.value, r.previous, period)}</span>
              <span className="text-muted-foreground"> · {prevRange.label}: {r.previous.toLocaleString("es")}</span>
            </p>
          </div>
        ))}
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Las cifras se calculan con la hora de {timeZone.replace("_", " ")}. Los sellos deshechos no se cuentan.
      </p>
    </>
  );
}
