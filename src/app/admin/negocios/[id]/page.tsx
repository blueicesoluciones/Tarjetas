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
import { BusinessEditForm, InviteOwnerForm, ProgramEditForm } from "./forms";

export const metadata: Metadata = { title: "Detalle del negocio" };

const ROLE_LABELS = { super_admin: "Super admin", owner: "Dueño", cashier: "Cajero" } as const;

export default async function BusinessDetailPage({ params }: PageProps<"/admin/negocios/[id]">) {
  const { id } = await params;
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

  const emails = new Map<string, string>();
  await Promise.all(
    (staff ?? []).map(async (p) => {
      const { data } = await admin.auth.admin.getUserById(p.id);
      if (data.user?.email) emails.set(p.id, data.user.email);
    }),
  );

  const enterAs = startImpersonation.bind(null, business.id);

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
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{ROLE_LABELS[p.role]}</Badge>
                    {!p.is_active ? <Badge className="bg-muted text-muted-foreground">Inactivo</Badge> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div>
            <h3 className="mb-3 text-sm font-semibold">Invitar a otro dueño</h3>
            <InviteOwnerForm businessId={business.id} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
