import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LockedFeature } from "@/components/panel/locked-feature";
import { PageHeader } from "@/components/panel/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getBusinessWithProgram } from "@/lib/auth/business";
import { requireStaff } from "@/lib/auth/staff";
import { campaignAudience, campaignsThisMonth } from "@/lib/campaigns";
import { formatDateTime } from "@/lib/panel/format";
import { campaignsLeft, planFeatures } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import { CampaignForm } from "./campaign-form";

export const metadata: Metadata = { title: "Campañas" };

interface CampaignRow {
  id: string;
  title: string;
  message: string;
  status: "sending" | "sent" | "failed";
  recipients: number;
  sent_count: number;
  created_at: string;
}

const STATUS = {
  sending: { label: "Enviando", className: "bg-muted text-foreground" },
  sent: { label: "Enviada", className: "bg-lime text-ink" },
  failed: { label: "Falló", className: "bg-red-100 text-red-800" },
} as const;

export default async function CampaignsPage() {
  const ctx = await requireStaff(["owner"], { needsBusiness: true });
  const { business } = await getBusinessWithProgram(ctx.businessId!);
  if (!business) notFound();
  const plan = planFeatures(business.plan);

  if (plan.campaignsPerMonth === 0) {
    return (
      <>
        <PageHeader title="Campañas" description="Avisos a los clientes que tienen tu tarjeta en Google Wallet." />
        <LockedFeature
          title="Campañas por Wallet"
          description='Envía avisos como "Hoy 2x1 en capuchinos" directo al celular de quienes tienen tu tarjeta guardada.'
          plan="medium"
        />
      </>
    );
  }

  const [sentThisMonth, audience, { data: history }] = await Promise.all([
    campaignsThisMonth(business.id, business.timezone),
    campaignAudience(business.id),
    createAdminClient()
      .from("wallet_campaigns")
      .select("id, title, message, status, recipients, sent_count, created_at")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })
      .limit(30)
      .returns<CampaignRow[]>(),
  ]);
  const left = campaignsLeft(business.plan, sentThisMonth);

  return (
    <>
      <PageHeader
        title="Campañas"
        description="Envía un aviso al celular de los clientes que tienen tu tarjeta en Google Wallet."
        action={
          <Badge variant="outline" className="h-7 px-3 text-sm">
            {left === null ? "Sin límite mensual" : `Te quedan ${left} de ${plan.campaignsPerMonth} este mes`}
          </Badge>
        }
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Nuevo aviso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="rounded-lg bg-muted p-3 text-sm">
            Le llegará a <strong>{audience.length}</strong> {audience.length === 1 ? "cliente" : "clientes"}: los que
            tienen la tarjeta guardada en Google Wallet y <strong>aceptaron recibir promociones</strong> al inscribirse
            (así lo exige la ley de protección de datos). Google limita cuántas notificaciones muestra al día por tarjeta,
            así que úsalas para algo especial.
          </p>
          <CampaignForm businessName={business.name} audience={audience.length} disabled={left === 0} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial</CardTitle>
        </CardHeader>
        <CardContent>
          {(history ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no has enviado campañas.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Aviso</TableHead>
                  <TableHead className="text-right">Enviados</TableHead>
                  <TableHead className="text-right">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(history ?? []).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(c.created_at, business.timezone)}</TableCell>
                    <TableCell>
                      <p className="font-medium">{c.title}</p>
                      <p className="line-clamp-1 text-xs text-muted-foreground">{c.message}</p>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {c.status === "sending" ? "—" : `${c.sent_count} / ${c.recipients}`}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge className={STATUS[c.status].className}>{STATUS[c.status].label}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
