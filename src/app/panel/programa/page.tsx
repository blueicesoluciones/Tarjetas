import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/panel/page-header";
import { SectionTabs } from "@/components/panel/section-tabs";
import { branchesForPlan } from "@/lib/branches";
import { getBusinessWithProgram } from "@/lib/auth/business";
import { requireStaff } from "@/lib/auth/staff";
import { planFeatures } from "@/lib/plans";
import { LockedFeature } from "@/components/panel/locked-feature";
import { getProgramMilestones } from "@/lib/rewards-server";
import { defaultWinbackMessage } from "@/lib/winback";
import { BranchLogos } from "./branch-logos";
import { ProgramForm } from "./program-form";
import { RewardsForm } from "./rewards-form";
import { WinbackForm } from "./winback-form";

export const metadata: Metadata = { title: "Programa" };

type Section = "tarjeta" | "premios" | "avisos" | "sedes";

export default async function ProgramPage({ searchParams }: PageProps<"/panel/programa">) {
  const ctx = await requireStaff(["owner"], { needsBusiness: true });
  const { business, program } = await getBusinessWithProgram(ctx.businessId!);
  if (!business || !program) notFound();
  const features = planFeatures(business.plan);
  const [milestones, branches] = await Promise.all([
    getProgramMilestones(program.id, business.plan, program.stamps_required),
    branchesForPlan(business.id, business.plan),
  ]);

  const tabs: { key: Section; label: string; href: string }[] = [
    { key: "tarjeta", label: "Tarjeta y marca", href: "/panel/programa" },
    { key: "premios", label: "Premios en el camino", href: "/panel/programa?seccion=premios" },
    { key: "avisos", label: "Aviso «Te extrañamos»", href: "/panel/programa?seccion=avisos" },
    ...(branches.length > 0
      ? [{ key: "sedes" as const, label: "Logos de sedes", href: "/panel/programa?seccion=sedes" }]
      : []),
  ];
  const requested = (await searchParams).seccion;
  const section: Section = tabs.find((t) => t.key === requested)?.key ?? "tarjeta";

  return (
    <>
      <PageHeader
        title="Programa"
        description="Las reglas de tu tarjeta, cómo se ve y lo que reciben tus clientes."
      />
      <SectionTabs tabs={tabs} active={section} />
      {section === "tarjeta" ? (
        <ProgramForm
          programId={program.id}
          designVersion={program.design_version}
          logoUrl={business.logo_url}
          backgroundUrl={business.card_background_url}
          canUseBackgroundImage={features.backgroundImage}
          milestones={milestones.map((m) => m.stampsAt)}
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
      ) : null}
      {section === "premios" ? (
        <div className="max-w-3xl">
          {features.milestoneRewards ? (
            <RewardsForm
              initial={milestones}
              stampsRequired={program.stamps_required}
              finalReward={program.reward_description}
            />
          ) : (
            <LockedFeature
              title="Premios en el camino"
              description="Regala algo antes de completar la tarjeta: por ejemplo un descuento a los 5 sellos y el premio a los 10."
              plan="medium"
            />
          )}
        </div>
      ) : null}
      {section === "avisos" ? (
        <div className="max-w-3xl">
          {features.winback ? (
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
      ) : null}
      {section === "sedes" ? <BranchLogos branches={branches} /> : null}
    </>
  );
}
