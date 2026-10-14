import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check, Mail, MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBusinessWithProgram } from "@/lib/auth/business";
import { requireStaff } from "@/lib/auth/staff";
import { LEGAL } from "@/lib/legal";
import { PLAN_ORDER, PLANS, planFeatures, planHighlights } from "@/lib/plans";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Mi plan" };

export default async function PlanPage() {
  const ctx = await requireStaff(["owner"], { needsBusiness: true });
  const { business } = await getBusinessWithProgram(ctx.businessId!);
  if (!business) notFound();
  const current = business.plan;
  const f = planFeatures(current);
  const whatsapp = f.support === "whatsapp" && LEGAL.supportWhatsapp ? LEGAL.supportWhatsapp.replace(/\D/g, "") : null;

  return (
    <>
      <PageHeader title="Mi plan" description={`${business.name} tiene el plan ${f.label}.`} />

      <div className="grid gap-4 md:grid-cols-3">
        {PLAN_ORDER.map((p) => {
          const isCurrent = p === current;
          return (
            <Card key={p} className={cn(isCurrent && "border-ink ring-2 ring-ink")}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {PLANS[p].label}
                  {isCurrent ? <span className="rounded-full bg-lime px-2.5 py-0.5 text-xs font-semibold text-ink">Tu plan</span> : null}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {planHighlights(p).map((item) => (
                    <li key={item} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-sage" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Soporte y cambios de plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Para subir de plan, agregar cajeros o resolver cualquier duda, escríbenos.
          </p>
          <div className="flex flex-wrap gap-3">
            {whatsapp ? (
              <a
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 font-medium text-paper"
              >
                <MessageCircle className="size-4" /> Soporte prioritario por WhatsApp
              </a>
            ) : null}
            <a
              href={`mailto:${LEGAL.email}?subject=${encodeURIComponent(`Soporte ${business.name}`)}`}
              className="inline-flex items-center gap-2 rounded-full border px-4 py-2 font-medium"
            >
              <Mail className="size-4" /> {LEGAL.email}
            </a>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
