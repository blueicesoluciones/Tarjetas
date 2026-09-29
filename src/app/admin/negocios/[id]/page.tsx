import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, LogIn } from "lucide-react";
import { StatusBadge } from "@/components/admin/status-badge";
import { Stat } from "@/components/admin/stat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { startImpersonation } from "@/app/actions/impersonation";
import { formatDate } from "@/lib/admin/format";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Business, Profile, Program } from "@/types/db";
import { setUserActive } from "../actions";
import { formatPhone } from "@/lib/domain/phone";
import { BusinessEditForm, ChangePasswordForm, CreateUserForm, ProgramEditForm } from "./forms";

export const metadata: Metadata = { title: "Detalle del negocio" };

const ROLE_LABELS = { super_admin: "Super admin", owner: "Dueño", cashier: "Cajero" } as const;

interface CustomerRow {
  id: string;
  full_name: string;
  phone_e164: string;
  created_at: string;
  pin_must_change: boolean;
  pin_locked_until: string | null;
  pin_lockout_count: number;
  cards: { stamps_count: number; total_redemptions: number; status: string }[];
}

export default async function BusinessDetailPage({ params, searchParams }: PageProps<"/admin/negocios/[id]">) {
  const { id } = await params;
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim().slice(0, 60) : "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const admin = createAdminClient();

  const [{ data: business }, { data: program }, { data: staff }, customers, cards, syncErrors] = await Promise.all([
    admin.from("businesses").select("*").eq("id", id).maybeSingle<Business>(),
    admin.from("programs").select("*").eq("business_id", id).eq("is_active", true).maybeSingle<Program>(),
    admin.from("profiles").select("*").eq("business_id", id).order("created_at").returns<Profile[]>(),
    admin.from("customers").select("id", { count: "exact", head: true }).eq("business_id", id).is("deleted_at", null),
    admin.from("cards").select("id", { count: "exact", head: true }).eq("business_id", id),
    admin.from("cards").select("id", { count: "exact", head: true }).eq("business_id", id).not("wallet_sync_error", "is", null),
  ]);
  if (!business) notFound();

  let customerQuery = admin
    .from("customers")
    .select("id, full_name, phone_e164, created_at, pin_must_change, pin_locked_until, pin_lockout_count, cards(stamps_count, total_redemptions, status)")
    .eq("business_id", id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);
  if (query) {
    const safe = query.replace(/[%_,()]/g, "");
    const digits = query.replace(/\D/g, "");
    customerQuery = customerQuery.or(
      digits.length >= 3 ? `full_name.ilike.%${safe}%,phone_e164.ilike.%${digits}%` : `full_name.ilike.%${safe}%`,
    );
  }
  const { data: customerRows } = await customerQuery.returns<CustomerRow[]>();
  const stampsRequired = program?.stamps_required ?? 0;

  const emails = new Map<string, string>();
  await Promise.all(
    (staff ?? []).map(async (p) => {
      const { data } = await admin.auth.admin.getUserById(p.id);
      if (data.user?.email) emails.set(p.id, data.user.email);
    }),
  );

  const enterAs = startImpersonation.bind(null, business.id, "/panel");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/negocios" className="text-sm text-muted-foreground hover:underline">
            ← Negocios
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <span
              aria-hidden
              className="inline-block size-6 rounded-full border"
              style={{ backgroundColor: business.primary_color }}
            />
            <h1 className="text-2xl font-bold tracking-tight">{business.name}</h1>
            <StatusBadge status={business.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Creado el {formatDate(business.created_at)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/n/${business.slug}`}
            target="_blank"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium hover:bg-muted"
          >
            <ExternalLink className="size-4" /> /n/{business.slug}
          </Link>
          <form action={enterAs}>
            <Button type="submit" size="lg">
              <LogIn /> Entrar como
            </Button>
          </form>
        </div>
      </div>

      {business.status === "suspended" ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          Negocio suspendido: sus tarjetas no aceptan sellos y no admite nuevas inscripciones.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Clientes" value={customers.count ?? 0} />
        <Stat label="Tarjetas" value={cards.count ?? 0} />
        <Stat label="Errores de Wallet" value={syncErrors.count ?? 0} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Clientes y tarjetas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="flex gap-2">
            <input
              name="q"
              defaultValue={query}
              placeholder="Buscar por nombre o teléfono"
              className="h-9 w-full max-w-sm rounded-lg border bg-background px-3 text-sm"
            />
            <Button type="submit" variant="outline">
              Buscar
            </Button>
          </form>
          {(customerRows ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">{query ? "Sin resultados." : "Este negocio aún no tiene clientes."}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-2 pr-3 font-medium">Cliente</th>
                    <th className="py-2 pr-3 font-medium">Teléfono</th>
                    <th className="py-2 pr-3 font-medium">Sellos</th>
                    <th className="py-2 pr-3 font-medium">Canjes</th>
                    <th className="py-2 pr-3 font-medium">Estado</th>
                    <th className="py-2 pr-3 font-medium">Inscrito</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {(customerRows ?? []).map((c) => {
                    const card = c.cards[0];
                    const locked =
                      c.pin_lockout_count >= 3 || (c.pin_locked_until && new Date(c.pin_locked_until) > new Date());
                    return (
                      <tr key={c.id} className="border-b last:border-0">
                        <td className="py-2 pr-3 font-medium">{c.full_name}</td>
                        <td className="py-2 pr-3 whitespace-nowrap">{formatPhone(c.phone_e164)}</td>
                        <td className="py-2 pr-3 tabular-nums">
                          {card ? `${card.stamps_count} / ${stampsRequired}` : "—"}
                        </td>
                        <td className="py-2 pr-3 tabular-nums">{card?.total_redemptions ?? 0}</td>
                        <td className="py-2 pr-3">
                          {locked ? (
                            <Badge className="bg-red-100 text-red-800">PIN bloqueado</Badge>
                          ) : c.pin_must_change ? (
                            <Badge className="bg-amber-100 text-amber-900">PIN temporal</Badge>
                          ) : card?.status === "blocked" ? (
                            <Badge className="bg-muted text-muted-foreground">Tarjeta bloqueada</Badge>
                          ) : (
                            <span className="text-muted-foreground">Activo</span>
                          )}
                        </td>
                        <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">{formatDate(c.created_at)}</td>
                        <td className="py-2 text-right">
                          <form action={startImpersonation.bind(null, business.id, `/panel/clientes/${c.id}`)}>
                            <Button type="submit" size="sm" variant="ghost">
                              Gestionar →
                            </Button>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            «Gestionar» entra como el negocio y abre la ficha del cliente: ajustar sellos, restablecer PIN, regenerar enlace o eliminar.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Datos del negocio</CardTitle>
        </CardHeader>
        <CardContent>
          <BusinessEditForm
            businessId={business.id}
            defaults={{
              name: business.name,
              slug: business.slug,
              primary_color: business.primary_color,
              text_color: business.text_color,
              default_country: business.default_country,
              timezone: business.timezone,
              contact_whatsapp: business.contact_whatsapp ?? "",
              status: business.status,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Programa</CardTitle>
        </CardHeader>
        <CardContent>
          {program ? (
            <>
              <ProgramEditForm
                programId={program.id}
                defaults={{
                  card_title: program.card_title,
                  stamps_required: program.stamps_required,
                  reward_description: program.reward_description,
                  stamp_cooldown_minutes: program.stamp_cooldown_minutes,
                  undo_window_minutes: program.undo_window_minutes,
                }}
              />
              <p className="mt-4 text-xs text-muted-foreground">
                Versión de diseño {program.design_version}
                {program.google_class_id ? ` · Clase Google: ${program.google_class_id}` : " · Sin clase de Google Wallet aún"}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Este negocio no tiene un programa activo.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Equipo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {(staff ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin usuarios todavía.</p>
          ) : (
            <ul className="divide-y text-sm">
              {(staff ?? []).map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div>
                    <p className="font-medium">{p.full_name}</p>
                    <p className="text-xs text-muted-foreground">{emails.get(p.id) ?? "—"}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{ROLE_LABELS[p.role]}</Badge>
                    <ChangePasswordForm userId={p.id} />
                    <form action={setUserActive}>
                      <input type="hidden" name="userId" value={p.id} />
                      <input type="hidden" name="active" value={p.is_active ? "false" : "true"} />
                      <Button type="submit" size="sm" variant="ghost">
                        {p.is_active ? "Desactivar" : "Reactivar"}
                      </Button>
                    </form>
                    {!p.is_active ? <Badge className="bg-muted text-muted-foreground">Inactivo</Badge> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div>
            <h3 className="mb-1 text-sm font-semibold">Crear usuario</h3>
            <p className="mb-3 text-xs text-muted-foreground">
              Entrégale el email y la contraseña a la persona. Ingresa en /login y la app la lleva a su panel o al escáner según su rol.
            </p>
            <CreateUserForm businessId={business.id} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
