import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventsTable } from "@/components/panel/events-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getBusinessWithProgram } from "@/lib/auth/business";
import { requireStaff } from "@/lib/auth/staff";
import { formatPhone } from "@/lib/domain/phone";
import { listEvents } from "@/lib/panel/events";
import { formatDate, formatDateTime, pinLockStatus } from "@/lib/panel/format";
import { createClient } from "@/lib/supabase/server";
import { AdjustForm } from "./adjust-form";
import { DeleteCustomer } from "./delete-customer";
import { RegenerateLinkButton, ResetPinButton } from "./customer-actions";

export const metadata: Metadata = { title: "Cliente" };

interface CustomerRow {
  id: string;
  business_id: string;
  full_name: string;
  phone_e164: string;
  email: string | null;
  pin_must_change: boolean;
  pin_locked_until: string | null;
  pin_lockout_count: number;
  marketing_consent: boolean;
  privacy_accepted_at: string;
  deleted_at: string | null;
  created_at: string;
}

interface CardRow {
  id: string;
  public_code: string;
  stamps_count: number;
  total_stamps: number;
  total_redemptions: number;
  last_stamp_at: string | null;
  status: "active" | "blocked";
  google_object_id: string | null;
  wallet_sync_error: string | null;
  wallet_synced_at: string | null;
}

export default async function CustomerDetailPage({ params }: PageProps<"/panel/clientes/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const ctx = await requireStaff(["owner"], { needsBusiness: true });
  const businessId = ctx.businessId!;
  const { business, program } = await getBusinessWithProgram(businessId);
  const timeZone = business?.timezone ?? "UTC";

  const supabase = await createClient();
  const { data: customer } = await supabase
    .from("customers")
    .select(
      "id, business_id, full_name, phone_e164, email, pin_must_change, pin_locked_until, pin_lockout_count, marketing_consent, privacy_accepted_at, deleted_at, created_at",
    )
    .eq("id", id)
    .eq("business_id", businessId)
    .maybeSingle<CustomerRow>();
  if (!customer || customer.deleted_at) notFound();

  const { data: card } = await supabase
    .from("cards")
    .select(
      "id, public_code, stamps_count, total_stamps, total_redemptions, last_stamp_at, status, google_object_id, wallet_sync_error, wallet_synced_at",
    )
    .eq("customer_id", customer.id)
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<CardRow>();

  const events = card ? await listEvents({ businessId, cardId: card.id, limit: 100 }) : [];
  const required = program?.stamps_required ?? 0;

  const lock = pinLockStatus(customer.pin_locked_until, customer.pin_lockout_count);
  const permanentlyLocked = lock === "permanent";
  const tempLocked = lock === "temporary";

  return (
    <>
      <Link href="/panel/clientes" className="text-sm text-muted-foreground hover:text-foreground">
        ← Clientes
      </Link>
      <div className="mt-2 mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{customer.full_name}</h1>
        {permanentlyLocked ? (
          <Badge variant="destructive">Bloqueado, restablece el PIN</Badge>
        ) : tempLocked ? (
          <Badge variant="destructive">Bloqueado temporalmente</Badge>
        ) : null}
        {customer.pin_must_change ? <Badge variant="outline">PIN temporal pendiente</Badge> : null}
        {card?.status === "blocked" ? <Badge variant="outline">Tarjeta bloqueada</Badge> : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Datos</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <Item label="Teléfono" value={formatPhone(customer.phone_e164)} />
              <Item label="Email" value={customer.email ?? "—"} />
              <Item label="Promociones" value={customer.marketing_consent ? "Acepta" : "No acepta"} />
              <Item label="Inscrito" value={formatDate(customer.created_at, timeZone)} />
              <Item label="Código de tarjeta" value={<span className="font-mono">{card?.public_code ?? "—"}</span>} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tarjeta</CardTitle>
            <CardDescription>{program?.reward_description}</CardDescription>
          </CardHeader>
          <CardContent>
            {card ? (
              <>
                <p className="text-4xl font-bold tabular-nums">
                  {card.stamps_count}
                  <span className="text-lg text-muted-foreground"> / {required}</span>
                </p>
                {card.stamps_count >= required ? (
                  <p className="mt-1 text-sm font-medium text-emerald-600">Premio disponible</p>
                ) : null}
                <dl className="mt-4 space-y-2 text-sm">
                  <Item label="Sellos históricos" value={card.total_stamps} />
                  <Item label="Canjes" value={card.total_redemptions} />
                  <Item label="Último sello" value={card.last_stamp_at ? formatDateTime(card.last_stamp_at, timeZone) : "—"} />
                  <Item label="Google Wallet" value={card.google_object_id ? "Creada" : "No agregada"} />
                </dl>
                {card.wallet_sync_error ? (
                  <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
                    Error de sincronización con Wallet: {card.wallet_sync_error}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Este cliente no tiene tarjeta.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {card ? <AdjustForm cardId={card.id} /> : null}
            <ResetPinButton customerId={customer.id} />
            <RegenerateLinkButton customerId={customer.id} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Historial</CardTitle>
        </CardHeader>
        <CardContent>
          <EventsTable events={events} timeZone={timeZone} showCustomer={false} />
        </CardContent>
      </Card>

      <DeleteCustomer customerId={customer.id} customerName={customer.full_name} />
    </>
  );
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
