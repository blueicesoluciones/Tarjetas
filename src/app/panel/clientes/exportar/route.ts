import { writeAudit } from "@/lib/audit";
import { getBusinessWithProgram } from "@/lib/auth/business";
import { staffForApi } from "@/lib/auth/staff";
import { jsonError } from "@/lib/http/json";
import { toCsv } from "@/lib/panel/csv";
import { planFeatures } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";

interface Row {
  full_name: string;
  phone_e164: string;
  marketing_consent: boolean;
  created_at: string;
  cards: {
    stamps_count: number;
    total_stamps: number;
    total_redemptions: number;
    last_stamp_at: string | null;
    google_object_id: string | null;
  }[];
}

/** Exporta los clientes del negocio a CSV (planes Medium y Pro). */
export async function GET() {
  const ctx = await staffForApi(["owner"]);
  if (!ctx?.businessId) return jsonError("No autorizado", 403);
  const { business, program } = await getBusinessWithProgram(ctx.businessId);
  if (!business) return jsonError("Negocio no encontrado", 404);
  if (!planFeatures(business.plan).csvExport) {
    return jsonError("Exportar clientes está disponible desde el plan Medium", 403);
  }

  const { data, error } = await createAdminClient()
    .from("customers")
    .select("full_name, phone_e164, marketing_consent, created_at, cards(stamps_count, total_stamps, total_redemptions, last_stamp_at, google_object_id)")
    .eq("business_id", business.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .returns<Row[]>();
  if (error) return jsonError("No se pudo generar el archivo", 500);

  const date = (iso: string | null) =>
    iso ? new Intl.DateTimeFormat("es-CO", { timeZone: business.timezone, dateStyle: "short" }).format(new Date(iso)) : "";
  const csv = toCsv(
    ["Nombre", "Celular", "Sellos actuales", "Sellos para el premio", "Sellos históricos", "Premios canjeados", "Último sello", "Google Wallet", "Acepta promociones", "Inscrito"],
    (data ?? []).map((c) => {
      const card = c.cards[0];
      return [
        c.full_name,
        c.phone_e164,
        card?.stamps_count ?? 0,
        program?.stamps_required ?? "",
        card?.total_stamps ?? 0,
        card?.total_redemptions ?? 0,
        date(card?.last_stamp_at ?? null),
        card?.google_object_id ? "Sí" : "No",
        c.marketing_consent ? "Sí" : "No",
        date(c.created_at),
      ];
    }),
  );

  await writeAudit({
    businessId: business.id,
    actorId: ctx.userId,
    action: "customers.export",
    entityType: "business",
    entityId: business.id,
    metadata: { rows: data?.length ?? 0 },
    impersonating: ctx.impersonating,
  });

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="clientes-${business.slug}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
