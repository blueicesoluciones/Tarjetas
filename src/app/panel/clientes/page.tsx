import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/panel/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getBusinessWithProgram } from "@/lib/auth/business";
import { requireStaff } from "@/lib/auth/staff";
import { formatPhone } from "@/lib/domain/phone";
import { formatDate, pinLockStatus } from "@/lib/panel/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Clientes" };

const PAGE_SIZE = 50;

interface Row {
  id: string;
  full_name: string;
  phone_e164: string;
  created_at: string;
  pin_lockout_count: number;
  pin_locked_until: string | null;
  cards: { id: string; stamps_count: number; status: string }[];
}

/** Quita caracteres con significado en los filtros de PostgREST. */
function sanitize(q: string) {
  return q.replace(/[,()*%\\:"']/g, " ").trim().slice(0, 60);
}

export default async function CustomersPage({ searchParams }: PageProps<"/panel/clientes">) {
  const ctx = await requireStaff(["owner"], { needsBusiness: true });
  const businessId = ctx.businessId!;
  const { business, program } = await getBusinessWithProgram(businessId);
  const timeZone = business?.timezone ?? "UTC";

  const sp = await searchParams;
  const q = sanitize(typeof sp.q === "string" ? sp.q : "");
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : 1) || 1);

  const supabase = await createClient();
  let query = supabase
    .from("customers")
    .select("id, full_name, phone_e164, created_at, pin_lockout_count, pin_locked_until, cards(id, stamps_count, status)", {
      count: "exact",
    })
    .eq("business_id", businessId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (q) {
    const digits = q.replace(/\D/g, "");
    const filters = [`full_name.ilike.*${q}*`];
    if (digits.length >= 3) filters.push(`phone_e164.ilike.*${digits}*`);
    query = query.or(filters.join(","));
  }

  const { data, count, error } = await query.returns<Row[]>();
  if (error) console.error("[panel] customers", error.message);
  const rows = data ?? [];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const required = program?.stamps_required ?? 0;

  const pageHref = (p: number) => `/panel/clientes?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;

  return (
    <>
      <PageHeader title="Clientes" description={`${total.toLocaleString("es")} ${q ? "resultados" : "clientes inscritos"}`} />
      <form className="mb-4 flex gap-2" role="search">
        <Input name="q" defaultValue={q} placeholder="Buscar por nombre o teléfono" className="h-10 max-w-sm" />
        <button type="submit" className={buttonVariants({ size: "lg" })}>
          Buscar
        </button>
        {q ? (
          <Link href="/panel/clientes" className={buttonVariants({ variant: "ghost", size: "lg" })}>
            Limpiar
          </Link>
        ) : null}
      </form>

      <Card>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {q ? "No encontramos clientes con esa búsqueda." : "Aún no hay clientes. Comparte tu enlace de inscripción."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead className="text-right">Sellos</TableHead>
                  <TableHead>Inscrito</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => {
                  const card = c.cards[0];
                  const locked = pinLockStatus(c.pin_locked_until, c.pin_lockout_count) !== null;
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Link href={`/panel/clientes/${c.id}`} className="font-medium hover:underline">
                          {c.full_name}
                        </Link>
                        {locked ? (
                          <Badge variant="destructive" className="ml-2">
                            Bloqueado
                          </Badge>
                        ) : null}
                        {card?.status === "blocked" ? (
                          <Badge variant="outline" className="ml-2">
                            Tarjeta bloqueada
                          </Badge>
                        ) : null}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatPhone(c.phone_e164)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {card ? (
                          <span className={card.stamps_count >= required ? "font-semibold text-emerald-600" : undefined}>
                            {card.stamps_count} / {required}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(c.created_at, timeZone)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {pages > 1 ? (
        <nav className="mt-4 flex items-center justify-center gap-2 text-sm">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className={buttonVariants({ variant: "outline" })}>
              ← Anterior
            </Link>
          ) : null}
          <span className="text-muted-foreground">
            Página {page} de {pages}
          </span>
          {page < pages ? (
            <Link href={pageHref(page + 1)} className={buttonVariants({ variant: "outline" })}>
              Siguiente →
            </Link>
          ) : null}
        </nav>
      ) : null}
    </>
  );
}
