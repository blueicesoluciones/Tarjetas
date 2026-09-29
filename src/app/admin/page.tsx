import type { Metadata } from "next";
import Link from "next/link";
import { Stat } from "@/components/admin/stat";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/admin/format";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { appleWallet, googleWallet } from "@/lib/wallet";
import type { BusinessStatus } from "@/types/db";

export const metadata: Metadata = { title: "Administración" };

function startOfTodayUtc() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export default async function AdminDashboard() {
  const admin = createAdminClient();
  const today = startOfTodayUtc();
  const weekAgo = new Date(today.getTime() - 6 * 24 * 3600_000);

  const countEvents = (type: "stamp" | "redeem", since: Date) =>
    admin
      .from("stamp_events")
      .select("id", { count: "exact", head: true })
      .eq("type", type)
      .is("undone_at", null)
      .gte("created_at", since.toISOString());

  const [businesses, customers, stampsToday, stampsWeek, redeemsWeek, syncErrors] = await Promise.all([
    admin.from("businesses").select("status").returns<{ status: BusinessStatus }[]>(),
    admin.from("customers").select("id", { count: "exact", head: true }).is("deleted_at", null),
    countEvents("stamp", today),
    countEvents("stamp", weekAgo),
    countEvents("redeem", weekAgo),
    admin
      .from("cards")
      .select("id, wallet_sync_error, updated_at, businesses(id, name)")
      .not("wallet_sync_error", "is", null)
      .order("updated_at", { ascending: false })
      .limit(10)
      .returns<{ id: string; wallet_sync_error: string; updated_at: string; businesses: { id: string; name: string } }[]>(),
  ]);

  const byStatus: Record<BusinessStatus, number> = { trial: 0, active: 0, suspended: 0 };
  for (const b of businesses.data ?? []) byStatus[b.status]++;
  const totalBusinesses = (businesses.data ?? []).length;

  const googleMode = serverEnv().GOOGLE_WALLET_MODE;
  const googleEnabled = googleWallet.isEnabled();
  const appleEnabled = appleWallet.isEnabled();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Resumen global</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Negocios"
          value={totalBusinesses}
          hint={`${byStatus.active} activos · ${byStatus.trial} en prueba · ${byStatus.suspended} suspendidos`}
        />
        <Stat label="Clientes" value={customers.count ?? 0} />
        <Stat label="Sellos hoy" value={stampsToday.count ?? 0} hint={`${stampsWeek.count ?? 0} en los últimos 7 días`} />
        <Stat label="Canjes (7 días)" value={redeemsWeek.count ?? 0} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Wallet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span>Google Wallet</span>
              {googleEnabled ? (
                <Badge className={googleMode === "production" ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"}>
                  {googleMode === "production" ? "Producción" : "Demo"}
                </Badge>
              ) : (
                <Badge variant="outline">Sin configurar</Badge>
              )}
            </div>
            {googleEnabled && googleMode === "demo" ? (
              <p className="text-xs text-muted-foreground">
                Modo demo: solo las cuentas de prueba registradas en la Google Pay &amp; Wallet Console pueden guardar pases.
              </p>
            ) : null}
            <div className="flex items-center justify-between gap-2">
              <span>Apple Wallet</span>
              <Badge variant="outline">{appleEnabled ? "Habilitado" : "Pendiente"}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Errores recientes de sincronización</CardTitle>
          </CardHeader>
          <CardContent>
            {(syncErrors.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin errores de sincronización. 🎉</p>
            ) : (
              <ul className="divide-y text-sm">
                {(syncErrors.data ?? []).map((c) => (
                  <li key={c.id} className="py-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <Link href={`/admin/negocios/${c.businesses.id}`} className="font-medium hover:underline">
                        {c.businesses.name}
                      </Link>
                      <span className="text-xs text-muted-foreground">{formatDateTime(c.updated_at)}</span>
                    </div>
                    <p className="mt-0.5 font-mono text-xs break-all text-destructive">{c.wallet_sync_error}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
