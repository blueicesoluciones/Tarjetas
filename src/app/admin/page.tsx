import type { Metadata } from "next";
import Link from "next/link";
import { Stat } from "@/components/admin/stat";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/admin/format";
import { appUrl, serverEnv } from "@/lib/env";
import { LEGACY_APPLE_ACTION, LEGACY_HOSTS, RESYNC_ALL_ACTION } from "@/lib/domains";
import { createAdminClient } from "@/lib/supabase/admin";
import { appleWallet, googleWallet } from "@/lib/wallet";
import type { BusinessStatus } from "@/types/db";
import { ResyncAllForm } from "./domain-migration";

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

  const legacySince = new Date(today.getTime() - 14 * 86_400_000).toISOString();
  const [businesses, customers, stampsToday, stampsWeek, redeemsWeek, syncErrors, appleRegs, legacyHits, lastResync] = await Promise.all([
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
    admin.from("apple_device_registrations").select("serial_number").returns<{ serial_number: string }[]>(),
    admin
      .from("audit_logs")
      .select("entity_id")
      .eq("action", LEGACY_APPLE_ACTION)
      .gte("created_at", legacySince)
      .limit(5000)
      .returns<{ entity_id: string }[]>(),
    admin
      .from("audit_logs")
      .select("created_at")
      .eq("action", RESYNC_ALL_ACTION)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ created_at: string }>(),
  ]);
  const legacyCount = new Set((legacyHits.data ?? []).map((r) => r.entity_id)).size;
  const appleCards = new Set((appleRegs.data ?? []).map((r) => r.serial_number)).size;
  // Los iPhone solo consultan cuando reciben un aviso: «0» vale cuando ya pasaron
  // 14 días desde la actualización general (da tiempo a los que estaban apagados).
  const resyncAt = lastResync.data ? new Date(lastResync.data.created_at) : null;
  const canRemoveLegacy = resyncAt !== null && legacyCount === 0 && today.getTime() - resyncAt.getTime() > 14 * 86_400_000;

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
            <CardTitle>Cambio de dominio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              Dirección actual: <span className="font-medium">{appUrl()}</span>
            </p>
            <p>
              Tarjetas de iPhone que usaron la dirección vieja ({LEGACY_HOSTS.join(", ")}) en los últimos 14 días:{" "}
              <span className="font-semibold">
                {legacyCount} de {appleCards}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              {resyncAt === null
                ? "Toca «Actualizar todas las tarjetas» para que cada iPhone reciba su tarjeta con la dirección nueva."
                : canRemoveLegacy
                  ? "Ningún iPhone depende ya de la dirección vieja: se puede quitar de Vercel."
                  : "No quites la dirección vieja de Vercel todavía. Se puede cuando este número esté en 0 y hayan pasado 14 días desde la actualización general (así alcanzan los celulares que estaban apagados o sin internet)."}
              {resyncAt ? ` Última actualización general: ${formatDateTime(resyncAt.toISOString())}.` : ""}
            </p>
            <ResyncAllForm />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
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
