import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BirthdaysToday } from "@/components/panel/birthdays-today";
import { EventsTable } from "@/components/panel/events-table";
import { LockedFeature } from "@/components/panel/locked-feature";
import { PageHeader } from "@/components/panel/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBusinessWithProgram } from "@/lib/auth/business";
import { requireStaff } from "@/lib/auth/staff";
import { branchesForPlan, selectedPanelBranch } from "@/lib/branches";
import { listEvents } from "@/lib/panel/events";
import { addDays, dayAndWeekStart, localDateString, startOfLocalDay } from "@/lib/panel/format";
import { bestWeekday, bucketByLocalDay, changeLabel, lastNDays, percent } from "@/lib/panel/metrics";
import { planFeatures } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Resumen" };

const DAY_MS = 86_400_000;

interface Tile {
  label: string;
  value: number | string;
  hint?: string;
}

export default async function PanelHomePage() {
  const ctx = await requireStaff(["owner"], { needsBusiness: true });
  const businessId = ctx.businessId!;
  const { business, program } = await getBusinessWithProgram(businessId);
  const timeZone = business?.timezone ?? "UTC";
  const level = planFeatures(business?.plan).metrics;
  const advanced = level !== "basic";
  const full = level === "full";
  // Multisede: con una sede elegida, sellos, canjes, gráfico y actividad son de esa sede.
  const branches = business ? await branchesForPlan(businessId, business.plan) : [];
  const branch = await selectedPanelBranch(branches);

  const now = new Date();
  const { dayStart, weekStart } = dayAndWeekStart(timeZone, now);
  const prevWeekStart = new Date(weekStart.getTime() - 7 * DAY_MS);
  // Mismo tramo de la semana anterior (lunes → mismo momento), para comparar justo.
  const prevWeekSameMoment = new Date(now.getTime() - 7 * DAY_MS);
  const today = localDateString(now, timeZone);
  const chartDays = lastNDays(today, 30);
  const chartStart = startOfLocalDay(chartDays[0], timeZone);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);

  const admin = createAdminClient();
  const countEvents = (type: "stamp" | "redeem", from?: Date, to?: Date) => {
    let q = admin
      .from("stamp_events")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("type", type)
      .is("undone_at", null);
    if (branch) q = q.eq("branch_id", branch.id);
    if (from) q = q.gte("created_at", from.toISOString());
    if (to) q = q.lt("created_at", to.toISOString());
    return q;
  };
  const countCustomers = (from?: Date, to?: Date) => {
    let q = admin.from("customers").select("id", { count: "exact", head: true }).eq("business_id", businessId).is("deleted_at", null);
    if (from) q = q.gte("created_at", from.toISOString());
    if (to) q = q.lt("created_at", to.toISOString());
    return q;
  };
  const countCards = () =>
    admin.from("cards").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("status", "active");

  // ---- Básico (todos los planes) ----
  const [customers, stampsToday, rewardReady, recent] = await Promise.all([
    countCustomers(),
    countEvents("stamp", dayStart),
    program ? countCards().eq("program_id", program.id).gte("stamps_count", program.stamps_required) : Promise.resolve({ count: 0 }),
    listEvents({ businessId, branchId: branch?.id, limit: 10 }),
  ]);
  const totalCustomers = customers.count ?? 0;

  const basicTiles: Tile[] = [
    { label: "Clientes inscritos", value: totalCustomers },
    { label: branch ? `Sellos hoy en ${branch.name}` : "Sellos hoy", value: stampsToday.count ?? 0 },
    { label: "Premios por canjear", value: rewardReady.count ?? 0, hint: "Clientes con la tarjeta completa" },
  ];

  // ---- Medium ----
  let advancedTiles: Tile[] = [];
  if (advanced) {
    const [stampsWeek, stampsPrevWeek, redeemWeek, redeemPrevWeek, redeemTotal, newWeek, newPrevWeek, inWallet, consent, active30] =
      await Promise.all([
        countEvents("stamp", weekStart),
        countEvents("stamp", prevWeekStart, prevWeekSameMoment),
        countEvents("redeem", weekStart),
        countEvents("redeem", prevWeekStart, prevWeekSameMoment),
        countEvents("redeem"),
        countCustomers(weekStart),
        countCustomers(prevWeekStart, prevWeekSameMoment),
        countCards().or("google_object_id.not.is.null,apple_serial_number.not.is.null"),
        admin
          .from("customers")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .is("deleted_at", null)
          .eq("marketing_consent", true),
        countCards().gte("last_stamp_at", thirtyDaysAgo.toISOString()),
      ]);
    const prevPeriod = "la semana anterior";
    advancedTiles = [
      {
        label: "Sellos esta semana",
        value: stampsWeek.count ?? 0,
        hint: changeLabel(stampsWeek.count ?? 0, stampsPrevWeek.count ?? 0, prevPeriod),
      },
      {
        label: "Canjes esta semana",
        value: redeemWeek.count ?? 0,
        hint: changeLabel(redeemWeek.count ?? 0, redeemPrevWeek.count ?? 0, prevPeriod),
      },
      {
        label: "Clientes nuevos esta semana",
        value: newWeek.count ?? 0,
        hint: changeLabel(newWeek.count ?? 0, newPrevWeek.count ?? 0, prevPeriod),
      },
      { label: "Canjes totales", value: redeemTotal.count ?? 0, hint: "Premios entregados desde el inicio" },
      {
        label: "Activos (30 días)",
        value: active30.count ?? 0,
        hint: `${percent(active30.count ?? 0, totalCustomers)}% de tus clientes vino en el último mes`,
      },
      {
        label: "En Wallet",
        value: inWallet.count ?? 0,
        hint: `${percent(inWallet.count ?? 0, totalCustomers)}% guardó la tarjeta en su celular`,
      },
      {
        label: "Aceptan promociones",
        value: consent.count ?? 0,
        hint: `${percent(consent.count ?? 0, totalCustomers)}% recibe tus campañas`,
      },
    ];
  }

  // ---- Pro ----
  let pro: Awaited<ReturnType<typeof loadProMetrics>> | null = null;
  if (full) pro = await loadProMetrics(businessId, timeZone, chartStart, chartDays, thirtyDaysAgo, totalCustomers, branch?.id);
  const byBranch =
    branches.length > 0 && !branch ? await loadBranchComparison(businessId, branches, dayStart, weekStart, thirtyDaysAgo) : [];

  return (
    <>
      <PageHeader
        title="Resumen"
        description={
          branch
            ? `Sede ${branch.name}: sellos, canjes, gráfico y actividad son de esta sede. Clientes, tarjetas y ranking son de todo el negocio.`
            : program
              ? `${program.card_title} · ${program.stamps_required} sellos → ${program.reward_description}`
              : undefined
        }
      />

      <BirthdaysToday businessId={businessId} timeZone={timeZone} />

      <TileGrid tiles={basicTiles} />

      {advanced ? (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Esta semana y tus clientes</h2>
          <TileGrid tiles={advancedTiles} />
        </section>
      ) : (
        <LockedFeature
          className="mt-6"
          title="Métricas detalladas"
          description="Compara tus sellos, canjes y clientes nuevos con la semana anterior, y conoce cuántos clientes están activos, guardaron la tarjeta y aceptan promociones."
          plan="medium"
        />
      )}

      {pro ? (
        <section className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Sellos por día (últimos 30 días)</CardTitle>
              </CardHeader>
              <CardContent>
                <DailyBars days={chartDays} values={pro.daily} timeZone={timeZone} />
              </CardContent>
            </Card>
            <div className="grid grid-cols-2 gap-3 self-start">
              {pro.tiles.map((t) => (
                <StatTile key={t.label} tile={t} />
              ))}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Clientes más frecuentes</CardTitle>
              </CardHeader>
              <CardContent>
                {pro.top.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Todavía no hay visitas registradas.</p>
                ) : (
                  <ol className="divide-y text-sm">
                    {pro.top.map((c, i) => (
                      <li key={c.cardId} className="flex items-center gap-3 py-2">
                        <span className="w-5 text-right text-muted-foreground tabular-nums">{i + 1}</span>
                        <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
                        <span className="tabular-nums">{c.visits} {c.visits === 1 ? "visita" : "visitas"}</span>
                        <span className="w-20 text-right text-muted-foreground tabular-nums">{c.redemptions} {c.redemptions === 1 ? "canje" : "canjes"}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>
            <Link
              href="/panel/reporte"
              className="group flex flex-col justify-between rounded-xl border bg-ink p-6 text-paper transition-colors hover:bg-ink/90"
            >
              <div>
                <p className="text-sm text-paper/70">Reporte mensual</p>
                <p className="mt-1 text-xl font-semibold">Clientes nuevos, sellos, canjes y clientes que regresaron, mes a mes.</p>
              </div>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-lime">
                Ver reporte <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </div>
        </section>
      ) : advanced ? (
        <LockedFeature
          className="mt-6"
          title="Gráficos, ranking de clientes y reporte mensual"
          description="Sellos por día, tus clientes más frecuentes, tasa de retorno, clientes inactivos y un reporte de cada mes."
          plan="pro"
        />
      ) : null}

      {byBranch.length > 0 ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Por sede</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-3 font-medium">Sede</th>
                  <th className="py-2 pr-3 text-right font-medium">Sellos hoy</th>
                  <th className="py-2 pr-3 text-right font-medium">Sellos semana</th>
                  <th className="py-2 pr-3 text-right font-medium">Canjes semana</th>
                  <th className="py-2 text-right font-medium">Sellos 30 días</th>
                </tr>
              </thead>
              <tbody>
                {byBranch.map((b) => (
                  <tr key={b.id} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium">
                      {b.name}
                      {b.isActive ? "" : <span className="ml-1 text-xs text-muted-foreground">(inactiva)</span>}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{b.today}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{b.week}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{b.redeemWeek}</td>
                    <td className="py-2 text-right tabular-nums">{b.month}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted-foreground">
              Elige una sede arriba para ver su resumen, actividad y equipo.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Actividad reciente</CardTitle>
          <Link href="/panel/actividad" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
            Ver todo →
          </Link>
        </CardHeader>
        <CardContent>
          <EventsTable events={recent} timeZone={timeZone} showBranch={branches.length > 0 && !branch} />
        </CardContent>
      </Card>
    </>
  );
}

async function loadProMetrics(
  businessId: string,
  timeZone: string,
  chartStart: Date,
  chartDays: string[],
  thirtyDaysAgo: Date,
  totalCustomers: number,
  branchId?: string,
) {
  const admin = createAdminClient();
  let chartQuery = admin
    .from("stamp_events")
    .select("created_at")
    .eq("business_id", businessId)
    .eq("type", "stamp")
    .is("undone_at", null)
    .gte("created_at", chartStart.toISOString());
  if (branchId) chartQuery = chartQuery.eq("branch_id", branchId);
  const [events, top, returning, inactive, visitSum] = await Promise.all([
    chartQuery.order("created_at").limit(10000).returns<{ created_at: string }[]>(),
    admin
      .from("cards")
      .select("id, total_stamps, total_redemptions, customers!inner(full_name, deleted_at)")
      .eq("business_id", businessId)
      .is("customers.deleted_at", null)
      .gt("total_stamps", 0)
      .order("total_stamps", { ascending: false })
      .limit(10)
      .returns<{ id: string; total_stamps: number; total_redemptions: number; customers: { full_name: string } }[]>(),
    admin
      .from("cards")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("status", "active")
      .gte("total_stamps", 2),
    admin
      .from("cards")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("status", "active")
      .lt("last_stamp_at", thirtyDaysAgo.toISOString()),
    admin
      .from("cards")
      .select("total_stamps")
      .eq("business_id", businessId)
      .eq("status", "active")
      .limit(20000)
      .returns<{ total_stamps: number }[]>(),
  ]);

  const dates = (events.data ?? []).map((e) => e.created_at);
  const daily = bucketByLocalDay(dates, timeZone, chartDays);
  const best = bestWeekday(dates, timeZone);
  const totalVisits = (visitSum.data ?? []).reduce((acc, c) => acc + c.total_stamps, 0);
  const avg = totalCustomers > 0 ? (totalVisits / totalCustomers).toFixed(1).replace(".", ",") : "0";

  const tiles: Tile[] = [
    {
      label: "Tasa de retorno",
      value: `${percent(returning.count ?? 0, totalCustomers)}%`,
      hint: "Clientes que han venido 2 o más veces",
    },
    {
      label: "Clientes inactivos",
      value: inactive.count ?? 0,
      hint: "Llevan más de 30 días sin venir",
    },
    { label: "Visitas por cliente", value: avg, hint: "Promedio de sellos por cliente" },
    {
      label: "Mejor día",
      value: best ? best.day.charAt(0).toUpperCase() + best.day.slice(1) : "—",
      hint: best ? "Día con más sellos en los últimos 30 días" : "Aún sin sellos en los últimos 30 días",
    },
  ];

  return {
    daily,
    tiles,
    top: (top.data ?? []).map((c) => ({
      cardId: c.id,
      name: c.customers.full_name,
      visits: c.total_stamps,
      redemptions: c.total_redemptions,
    })),
  };
}

/** Sellos y canjes de cada sede (vista general). */
async function loadBranchComparison(
  businessId: string,
  branches: { id: string; name: string; is_active: boolean }[],
  dayStart: Date,
  weekStart: Date,
  thirtyDaysAgo: Date,
) {
  const since = new Date(Math.min(thirtyDaysAgo.getTime(), weekStart.getTime()));
  const { data } = await createAdminClient()
    .from("stamp_events")
    .select("branch_id, type, created_at")
    .eq("business_id", businessId)
    .in("type", ["stamp", "redeem"])
    .is("undone_at", null)
    .not("branch_id", "is", null)
    .gte("created_at", since.toISOString())
    .limit(50000)
    .returns<{ branch_id: string; type: "stamp" | "redeem"; created_at: string }[]>();
  return branches.map((b) => {
    const rows = (data ?? []).filter((e) => e.branch_id === b.id);
    const at = (e: { created_at: string }) => new Date(e.created_at).getTime();
    const stamps = rows.filter((e) => e.type === "stamp");
    return {
      id: b.id,
      name: b.name,
      isActive: b.is_active,
      today: stamps.filter((e) => at(e) >= dayStart.getTime()).length,
      week: stamps.filter((e) => at(e) >= weekStart.getTime()).length,
      redeemWeek: rows.filter((e) => e.type === "redeem" && at(e) >= weekStart.getTime()).length,
      month: stamps.filter((e) => at(e) >= thirtyDaysAgo.getTime()).length,
    };
  });
}

function TileGrid({ tiles }: { tiles: Tile[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {tiles.map((t) => (
        <StatTile key={t.label} tile={t} />
      ))}
    </div>
  );
}

function StatTile({ tile }: { tile: Tile }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{tile.label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">
        {typeof tile.value === "number" ? tile.value.toLocaleString("es") : tile.value}
      </p>
      {tile.hint ? <p className="mt-1 text-xs leading-snug text-muted-foreground">{tile.hint}</p> : null}
    </div>
  );
}

/** Barras simples en HTML/CSS: una por día, con el total del período. */
function DailyBars({ days, values, timeZone }: { days: string[]; values: number[]; timeZone: string }) {
  const max = Math.max(1, ...values);
  const total = values.reduce((a, b) => a + b, 0);
  const fmt = new Intl.DateTimeFormat("es", { day: "numeric", month: "short", timeZone: "UTC" });
  const label = (ymd: string) => {
    const [y, m, d] = ymd.split("-").map(Number);
    return fmt.format(new Date(Date.UTC(y, m - 1, d)));
  };
  const todayYmd = localDateString(new Date(), timeZone);
  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        <span className="text-2xl font-bold text-foreground tabular-nums">{total.toLocaleString("es")}</span> sellos en 30 días
      </p>
      <div className="flex h-40 items-end gap-[3px]" role="img" aria-label={`Sellos por día: ${total} en total`}>
        {values.map((v, i) => (
          <div key={days[i]} className="group relative flex h-full flex-1 items-end">
            <div
              className={cn("w-full rounded-t-sm", days[i] === todayYmd ? "bg-lime" : v > 0 ? "bg-ink" : "bg-sand/60")}
              style={{ height: `${v > 0 ? Math.max(6, (v / max) * 100) : 3}%` }}
            />
            <span className="pointer-events-none absolute bottom-full left-1/2 mb-1 hidden -translate-x-1/2 rounded bg-ink px-1.5 py-0.5 text-[10px] whitespace-nowrap text-paper group-hover:block">
              {label(days[i])}: {v}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
        <span>{label(days[0])}</span>
        <span>{label(addDays(days[0], 15))}</span>
        <span>Hoy</span>
      </div>
    </div>
  );
}
