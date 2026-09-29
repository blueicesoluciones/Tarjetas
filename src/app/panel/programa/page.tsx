import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/panel/page-header";
import { getBusinessWithProgram } from "@/lib/auth/business";
import { requireStaff } from "@/lib/auth/staff";
import { ProgramForm } from "./program-form";

export const metadata: Metadata = { title: "Programa" };

export default async function ProgramPage() {
  const ctx = await requireStaff(["owner"], { needsBusiness: true });
  const { business, program } = await getBusinessWithProgram(ctx.businessId!);
  if (!business || !program) notFound();

  return (
    <>
      <PageHeader title="Programa y diseño" description="Reglas de la tarjeta y cómo se ve para tus clientes." />
      <ProgramForm
        programId={program.id}
        designVersion={program.design_version}
        logoUrl={business.logo_url}
        initial={{
          cardTitle: program.card_title,
          stampsRequired: program.stamps_required,
          rewardDescription: program.reward_description,
          stampCooldownMinutes: program.stamp_cooldown_minutes,
          undoWindowMinutes: program.undo_window_minutes,
          businessName: business.name,
          primaryColor: business.primary_color,
          textColor: business.text_color,
          contactWhatsapp: business.contact_whatsapp ?? "",
          defaultCountry: business.default_country,
          timezone: business.timezone,
        }}
      />
    </>
  );
}
