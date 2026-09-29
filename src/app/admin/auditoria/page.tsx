import type { Metadata } from "next";
import { nativeSelectClass } from "@/components/admin/fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/admin/format";
import { createClient } from "@/lib/supabase/server";
import type { AuditLog } from "@/types/db";

export const metadata: Metadata = { title: "Auditoría" };

const UUID_RE = /^[0-9a-f-]{36}$/i;

export default async function AuditPage({ searchParams }: PageProps<"/admin/auditoria">) {
  const sp = await searchParams;
  const businessFilter = typeof sp.negocio === "string" && UUID_RE.test(sp.negocio) ? sp.negocio : "";
  const actionFilter = typeof sp.accion === "string" ? sp.accion.trim().slice(0, 60) : "";

  // Cliente con la sesión del usuario: RLS permite al super_admin leer todo.
  const supabase = await createClient();

  let query = supabase
    .from("audit_logs")
    .select("id, business_id, actor_id, action, entity_type, entity_id, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (businessFilter) query = query.eq("business_id", businessFilter);
  if (actionFilter) query = query.ilike("action", `%${actionFilter.replace(/[%_]/g, "")}%`);

  const [{ data: logs }, { data: businesses }, { data: profiles }] = await Promise.all([
    query.returns<AuditLog[]>(),
    supabase.from("businesses").select("id, name").order("name").returns<{ id: string; name: string }[]>(),
    supabase.from("profiles").select("id, full_name").returns<{ id: string; full_name: string }[]>(),
  ]);

  const businessName = new Map((businesses ?? []).map((b) => [b.id, b.name]));
  const actorName = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Auditoría</h1>

      <form className="flex flex-wrap items-end gap-3" method="get">
        <div className="space-y-1.5">
          <label htmlFor="negocio" className="text-sm font-medium">
            Negocio
          </label>
          <select id="negocio" name="negocio" defaultValue={businessFilter} className={`${nativeSelectClass} min-w-48`}>
            <option value="">Todos</option>
            {(businesses ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="accion" className="text-sm font-medium">
            Acción contiene
          </label>
          <Input id="accion" name="accion" defaultValue={actionFilter} placeholder="pin.reset, card.redeem…" />
        </div>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">
        {(logs ?? []).length === 200 ? "Mostrando los últimos 200 registros." : `${(logs ?? []).length} registros.`}
      </p>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Acción</TableHead>
              <TableHead>Negocio</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Entidad</TableHead>
              <TableHead>Detalle</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(logs ?? []).map((log) => {
              const meta = log.metadata ?? {};
              const hasMeta = Object.keys(meta).length > 0;
              return (
                <TableRow key={log.id} className="align-top">
                  <TableCell className="text-xs whitespace-nowrap text-muted-foreground">{formatDateTime(log.created_at)}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {log.action}
                    {meta.impersonating === true ? (
                      <span className="ml-1 rounded bg-amber-100 px-1 text-amber-900">ver como</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-sm">{log.business_id ? (businessName.get(log.business_id) ?? "—") : "Global"}</TableCell>
                  <TableCell className="text-sm">
                    {log.actor_id ? (actorName.get(log.actor_id) ?? "—") : <span className="text-muted-foreground">Cliente / sistema</span>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {log.entity_type ?? "—"}
                    {log.entity_id ? <span className="block font-mono">{log.entity_id.slice(0, 8)}…</span> : null}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    {hasMeta ? (
                      <details>
                        <summary className="cursor-pointer text-xs text-muted-foreground">Ver</summary>
                        <pre className="mt-1 max-h-48 overflow-auto rounded bg-muted p-2 text-[11px] whitespace-pre-wrap break-all">
                          {JSON.stringify(meta, null, 1)}
                        </pre>
                      </details>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
