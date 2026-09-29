import type { Metadata } from "next";
import Link from "next/link";
import { EventsTable } from "@/components/panel/events-table";
import { PageHeader } from "@/components/panel/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBusinessWithProgram } from "@/lib/auth/business";
import { requireStaff } from "@/lib/auth/staff";
import { listEvents } from "@/lib/panel/events";
import { dayAndWeekStart } from "@/lib/panel/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Resumen" };

export default async function PanelHomePage() {
  const ctx = await requireStaff(["owner"], { needsBusiness: true });
  const businessId = ctx.businessId!;
  const { business, program } = await getBusinessWithProgram(businessId);
  const timeZone = business?.timezone ?? "UTC";
  const { dayStart, weekStart } = dayAndWeekStart(timeZone);

  const supabase = await createClient();
  const countEvents = (type: "stamp" | "redeem", from?: Date) => {
    let q = supabase
      .from("stamp_events")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("type", type)
      .is("undone_at", null);
    if (from) q = q.gte("created_at", from.toISOString());
    return q;
  };

  const [customers, stampsToday, stampsWeek, redeemWeek, redeemTotal, rewardReady, recent] = await Promise.all([
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .is("deleted_at", null),
    countEvents("stamp", dayStart),
    countEvents("stamp", weekStart),
    countEvents("redeem", weekStart),
    countEvents("redeem"),
    program
      ? supabase
          .from("cards")
          .select("id", { count: "exact", head: true })
          .eq("program_id", program.id)
          .eq("status", "active")
          .gte("stamps_count", program.stamps_required)
      : Promise.resolve({ count: 0 }),
    listEvents({ businessId, limit: 10 }),
  ]);

  const metrics = [
    { label: "Clientes", value: customers.count ?? 0 },
    { label: "Sellos hoy", value: stampsToday.count ?? 0 },
    { label: "Sellos esta semana", value: stampsWeek.count ?? 0 },
    { label: "Canjes esta semana", value: redeemWeek.count ?? 0 },
    { label: "Canjes totales", value: redeemTotal.count ?? 0 },
    { label: "Premios por canjear", value: rewardReady.count ?? 0 },
  ];

  return (
    <>
      <PageHeader
        title="Resumen"
        description={program ? `${program.card_title} · ${program.stamps_required} sellos → ${program.reward_description}` : undefined}
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">{m.label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{m.value.toLocaleString("es")}</p>
          </div>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Actividad reciente</CardTitle>
          <Link href="/panel/actividad" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
            Ver todo →
          </Link>
        </CardHeader>
        <CardContent>
          <EventsTable events={recent} timeZone={timeZone} />
        </CardContent>
      </Card>
    </>
  );
}
