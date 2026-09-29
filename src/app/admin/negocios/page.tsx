import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { StatusBadge } from "@/components/admin/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/admin/format";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BusinessStatus } from "@/types/db";

export const metadata: Metadata = { title: "Negocios" };

interface Row {
  id: string;
  name: string;
  slug: string;
  status: BusinessStatus;
  created_at: string;
  customers: { count: number }[];
}

export default async function BusinessesPage({ searchParams }: PageProps<"/admin/negocios">) {
  const { elige } = await searchParams;
  const { data } = await createAdminClient()
    .from("businesses")
    .select("id, name, slug, status, created_at, customers(count)")
    .order("created_at", { ascending: false })
    .returns<Row[]>();
  const businesses = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Negocios</h1>
        <Link href="/admin/negocios/nuevo" className={buttonVariants({ size: "lg" })}>
          <Plus /> Nuevo negocio
        </Link>
      </div>

      {elige === "1" ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Elige un negocio para entrar como su dueño (&ldquo;Entrar como&rdquo; en el detalle).
        </p>
      ) : null}

      {businesses.length === 0 ? (
        <p className="text-muted-foreground">Aún no hay negocios. Crea el primero.</p>
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Negocio</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Clientes</TableHead>
                <TableHead className="hidden sm:table-cell">Creado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {businesses.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <Link href={`/admin/negocios/${b.id}`} className="font-medium hover:underline">
                      {b.name}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{b.slug}</TableCell>
                  <TableCell>
                    <StatusBadge status={b.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{b.customers[0]?.count ?? 0}</TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">{formatDate(b.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
