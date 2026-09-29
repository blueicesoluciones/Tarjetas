import type { Metadata } from "next";
import Link from "next/link";
import { EventsTable } from "@/components/panel/events-table";
import { PageHeader } from "@/components/panel/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getBusinessWithProgram } from "@/lib/auth/business";
import { requireStaff } from "@/lib/auth/staff";
import { listEvents } from "@/lib/panel/events";
import { EVENT_LABELS, addDays, startOfLocalDay } from "@/lib/panel/format";
import type { StampEventType } from "@/types/db";

export const metadata: Metadata = { title: "Actividad" };

const TYPES = Object.keys(EVENT_LABELS) as StampEventType[];
const YMD = /^\d{4}-\d{2}-\d{2}$/;

export default async function ActivityPage({ searchParams }: PageProps<"/panel/actividad">) {
  const ctx = await requireStaff(["owner"], { needsBusiness: true });
  const { business } = await getBusinessWithProgram(ctx.businessId!);
  const timeZone = business?.timezone ?? "UTC";

  const sp = await searchParams;
  const typeParam = typeof sp.tipo === "string" ? sp.tipo : "";
  const type = TYPES.includes(typeParam as StampEventType) ? (typeParam as StampEventType) : undefined;
  const from = typeof sp.desde === "string" && YMD.test(sp.desde) ? sp.desde : "";
  const to = typeof sp.hasta === "string" && YMD.test(sp.hasta) ? sp.hasta : "";

  const events = await listEvents({
    businessId: ctx.businessId!,
    type,
    from: from ? startOfLocalDay(from, timeZone) : undefined,
    to: to ? startOfLocalDay(addDays(to, 1), timeZone) : undefined,
    limit: 100,
  });

  const selectClass = "h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm";

  return (
    <>
      <PageHeader title="Actividad" description="Sellos, canjes y ajustes de tu negocio (últimos 100 según el filtro)." />
      <form className="mb-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="tipo">Tipo</Label>
          <select id="tipo" name="tipo" defaultValue={type ?? ""} className={selectClass}>
            <option value="">Todos</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {EVENT_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="desde">Desde</Label>
          <Input id="desde" name="desde" type="date" defaultValue={from} className="h-9" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="hasta">Hasta</Label>
          <Input id="hasta" name="hasta" type="date" defaultValue={to} className="h-9" />
        </div>
        <button type="submit" className={buttonVariants({ size: "lg" })}>
          Filtrar
        </button>
        {type || from || to ? (
          <Link href="/panel/actividad" className={buttonVariants({ variant: "ghost", size: "lg" })}>
            Limpiar
          </Link>
        ) : null}
      </form>
      <Card>
        <CardContent>
          <EventsTable events={events} timeZone={timeZone} emptyText="No hay movimientos con estos filtros." />
        </CardContent>
      </Card>
    </>
  );
}
