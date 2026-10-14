import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/panel/page-header";
import { getBusinessWithProgram } from "@/lib/auth/business";
import { requireStaff } from "@/lib/auth/staff";
import { planFeatures } from "@/lib/plans";
import { LockedFeature } from "@/components/panel/locked-feature";
import { defaultWinbackMessage } from "@/lib/winback";
import { ProgramForm } from "./program-form";
import { WinbackForm } from "./winback-form";

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
        backgroundUrl={business.card_background_url}
        canUseBackgroundImage={planFeatures(business.plan).backgroundImage}
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
      <div className="mt-8 max-w-3xl">
        {planFeatures(business.plan).winback ? (
          <WinbackForm
            days={program.winback_days}
            message={program.winback_message ?? defaultWinbackMessage(business.name)}
          />
        ) : (
          <LockedFeature
            title="Aviso automático «Te extrañamos»"
            description="Recupera clientes: les llega un aviso a su Google Wallet cuando llevan varios días sin venir."
            plan="pro"
          />
        )}
      </div>
    </>
  );
}
