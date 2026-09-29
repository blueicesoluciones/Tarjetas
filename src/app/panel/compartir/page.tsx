import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/panel/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getBusinessWithProgram } from "@/lib/auth/business";
import { requireStaff } from "@/lib/auth/staff";
import { appUrl } from "@/lib/env";
import { ShareQr } from "./share-qr";

export const metadata: Metadata = { title: "Compartir" };

export default async function SharePage() {
  const ctx = await requireStaff(["owner"], { needsBusiness: true });
  const { business, program } = await getBusinessWithProgram(ctx.businessId!);
  if (!business || !program) notFound();
  const url = appUrl(`/n/${business.slug}`);

  return (
    <>
      <PageHeader
        title="Compartir"
        description="Imprime este QR en tu local o comparte el enlace por WhatsApp y redes para que tus clientes creen su tarjeta."
      />
      <Card className="max-w-lg">
        <CardContent className="space-y-4">
          <ShareQr url={url} fileName={`qr-${business.slug}.png`} />
          <Link href="/panel/compartir/imprimir" target="_blank" className={buttonVariants({ variant: "outline", className: "w-full" })}>
            Versión para imprimir
          </Link>
        </CardContent>
      </Card>
    </>
  );
}
