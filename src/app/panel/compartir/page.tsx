import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  // design_version en la URL para que la vista previa se actualice tras cambiar el diseño.
  const poster = `/panel/compartir/afiche?v=${program.design_version}`;

  return (
    <>
      <PageHeader
        title="Compartir"
        description="Publica el afiche en tus redes o imprímelo para tu local. Tus clientes escanean el QR y crean su tarjeta."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Afiche de bienvenida</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- imagen generada en el servidor */}
            <img src={poster} alt="Afiche del programa de fidelidad" width={1080} height={1350} className="h-auto w-full rounded-xl border shadow-sm" />
            <a href={`${poster}&descargar=1`} download className={buttonVariants({ className: "w-full" })}>
              <Download /> Descargar afiche (PNG)
            </a>
            <p className="text-xs text-muted-foreground">
              1080×1350: ideal para Instagram, WhatsApp y para imprimir. Usa los colores, el fondo y el logo de la sección Programa.
            </p>
          </CardContent>
        </Card>
        <Card className="self-start">
          <CardHeader>
            <CardTitle>Solo el QR y el enlace</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ShareQr url={url} fileName={`qr-${business.slug}.png`} />
            <Link href="/panel/compartir/imprimir" target="_blank" className={buttonVariants({ variant: "outline", className: "w-full" })}>
              Versión para imprimir
            </Link>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
