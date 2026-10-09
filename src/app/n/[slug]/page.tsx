import type { Metadata } from "next";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { PoweredByStamp } from "@/components/brand/logo";
import { BrandHeader } from "@/components/customer/brand-header";
import { InAppBrowserNotice } from "@/components/customer/in-app-browser-notice";
import { detectDevice } from "@/lib/domain/device";
import { appUrl } from "@/lib/env";
import { userAgent } from "@/lib/request";
import { getSavedCard } from "@/lib/customers/service";
import { loadPublicBusiness } from "./data";
import { RegisterForm } from "./register-form";

export async function generateMetadata({ params }: PageProps<"/n/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { business, program } = await loadPublicBusiness(slug);
  return {
    title: program.card_title,
    description: `Tarjeta de sellos de ${business.name}: ${program.reward_description}`,
  };
}

export default async function BusinessLandingPage({ params }: PageProps<"/n/[slug]">) {
  const { slug } = await params;
  const { business, program } = await loadPublicBusiness(slug);

  // Siempre se muestra el formulario: varias personas pueden inscribirse desde el
  // mismo equipo. Si este navegador tiene una tarjeta del negocio, se ofrece
  // entrar a ella confirmando el PIN.
  const savedCard = await getSavedCard(business.id);

  const device = detectDevice(await userAgent());
  const suspended = business.status === "suspended";

  return (
    <div className="bg-muted/40 min-h-dvh">
      <BrandHeader
        name={business.name}
        logoUrl={business.logo_url}
        primaryColor={business.primary_color}
        textColor={business.text_color}
        backgroundUrl={business.card_background_url}
        subtitle={`Junta ${program.stamps_required} sellos y obtén: ${program.reward_description}`}
      />
      <main className="mx-auto -mt-10 max-w-md space-y-4 px-4 pb-12">
        {device.inAppBrowser ? (
          <InAppBrowserNotice app={device.inAppBrowser} platform={device.platform} />
        ) : null}

        {savedCard && !suspended ? (
          <Link
            href={`/n/${business.slug}/ingresar?guardada=1`}
            className="bg-background hover:bg-muted flex items-center justify-between gap-3 rounded-2xl p-4 shadow-sm transition-colors"
          >
            <span className="text-sm">
              ¿Eres <strong>{savedCard.firstName}</strong>? Ya tienes una tarjeta en este equipo.
            </span>
            <span className="shrink-0 text-sm font-semibold underline">Ver mi tarjeta</span>
          </Link>
        ) : null}

        {suspended ? (
          <div className="bg-background rounded-2xl p-6 text-center shadow-sm">
            <p className="font-medium">Este negocio no está recibiendo inscripciones por ahora.</p>
          </div>
        ) : (
          <>
            <section className="bg-background rounded-2xl p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Crear mi tarjeta</h2>
              <p className="text-muted-foreground mb-4 text-sm">
                Sin apps ni contraseñas. Solo tu nombre, celular y un PIN.
              </p>
              <RegisterForm
                slug={business.slug}
                country={business.default_country}
                buttonColor={business.primary_color}
                buttonText={business.text_color}
              />
            </section>
            <Link
              href={`/n/${business.slug}/ingresar`}
              className="bg-background hover:bg-muted block rounded-2xl p-5 text-center font-medium shadow-sm transition-colors"
            >
              Ya tengo tarjeta →
            </Link>
          </>
        )}

        {device.platform === "desktop" ? (
          <section className="bg-background hidden rounded-2xl p-5 text-center shadow-sm sm:block">
            <p className="text-muted-foreground mb-3 text-sm">
              Escanea con tu celular para abrir esta página
            </p>
            <QRCodeSVG value={appUrl(`/n/${business.slug}`)} size={160} className="mx-auto" />
          </section>
        ) : null}

        <div className="flex justify-center pt-2">
          <PoweredByStamp />
        </div>
        <p className="text-muted-foreground text-center text-xs">
          <Link href="/privacidad" className="underline">
            Política de privacidad
          </Link>{" "}
          ·{" "}
          <Link href="/terminos" className="underline">
            Términos
          </Link>{" "}
          ·{" "}
          <Link href="/soporte" className="underline">
            Soporte
          </Link>
        </p>
      </main>
    </div>
  );
}
