import type { Metadata } from "next";
import { PageHeader } from "@/components/panel/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getBusinessWithProgram } from "@/lib/auth/business";
import { requireStaff } from "@/lib/auth/staff";
import { formatDate } from "@/lib/panel/format";
import { planFeatures } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/db";
import { DeleteCashierButton } from "@/components/staff/delete-cashier-button";
import { deleteCashier, setCashierActive } from "./actions";

export const metadata: Metadata = { title: "Equipo" };

const ROLE_LABEL = { owner: "Dueño/a", cashier: "Cajero/a", super_admin: "Admin" } as const;

export default async function TeamPage() {
  const ctx = await requireStaff(["owner"], { needsBusiness: true });
  const { business } = await getBusinessWithProgram(ctx.businessId!);
  const timeZone = business?.timezone ?? "UTC";

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, role, business_id, is_active, created_at")
    .eq("business_id", ctx.businessId!)
    .order("role")
    .order("full_name")
    .returns<Profile[]>();
  const staff = data ?? [];
  const plan = planFeatures(business?.plan);
  const activeCashiers = staff.filter((p) => p.role === "cashier" && p.is_active).length;
  const atLimit = plan.maxCashiers !== null && activeCashiers >= plan.maxCashiers;

  return (
    <>
      <PageHeader title="Equipo" description="Personas que pueden sumar sellos en tu negocio." />
      <div className="space-y-4">
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Desde</TableHead>
                  <TableHead className="text-right">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.full_name}
                      {p.id === ctx.userId ? <span className="text-muted-foreground ml-1">(tú)</span> : null}
                    </TableCell>
                    <TableCell>{ROLE_LABEL[p.role]}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(p.created_at, timeZone)}
                    </TableCell>
                    <TableCell className="text-right">
                      {p.role === "cashier" ? (
                        <div className="inline-flex items-center gap-1">
                          <form action={setCashierActive} className="inline-flex items-center gap-2">
                            <input type="hidden" name="profileId" value={p.id} />
                            <input type="hidden" name="active" value={p.is_active ? "false" : "true"} />
                            {p.is_active ? (
                              <Badge variant="secondary">Activo</Badge>
                            ) : (
                              <Badge variant="outline">Desactivado</Badge>
                            )}
                            <Button
                              type="submit"
                              size="sm"
                              variant="ghost"
                              disabled={!p.is_active && atLimit}
                              title={
                                !p.is_active && atLimit
                                  ? "Llegaste al límite de cajeros de tu plan"
                                  : undefined
                              }
                            >
                              {p.is_active ? "Desactivar" : "Reactivar"}
                            </Button>
                          </form>
                          <DeleteCashierButton
                            action={deleteCashier}
                            fieldName="profileId"
                            profileId={p.id}
                            name={p.full_name}
                          />
                        </div>
                      ) : (
                        <Badge variant="secondary">Activo</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <p className="text-sm">
          <span className="font-medium">
            {activeCashiers} de {plan.maxCashiers ?? "ilimitados"} cajeros activos
          </span>{" "}
          <span className="text-muted-foreground">(plan {plan.label})</span>
          {atLimit ? (
            <span className="text-muted-foreground">
              {" "}
              · Llegaste al límite de tu plan: para sumar otro cajero desactiva uno o sube de plan.
            </span>
          ) : null}
        </p>
        <p className="text-muted-foreground text-sm">
          Para agregar un cajero o cambiar una contraseña, pídeselo al administrador de la plataforma.
        </p>
      </div>
    </>
  );
}
