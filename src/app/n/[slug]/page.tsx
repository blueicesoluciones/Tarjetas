import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { PoweredByStamp } from "@/components/brand/logo";
import { BrandHeader } from "@/components/customer/brand-header";
import { InAppBrowserNotice } from "@/components/customer/in-app-browser-notice";
import { getCustomerSession } from "@/lib/customer-session";
import { detectDevice } from "@/lib/domain/device";
import { appUrl } from "@/lib/env";
import { userAgent } from "@/lib/request";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadPublicBusiness } from "./data";
import { RegisterForm } from "./register-form";

export async function generateMetadata({ params }: PageProps<"/n/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { business, program } = await loadPublicBusiness(slug);
  return { title: program.card_title, description: `Tarjeta de sellos de ${business.name}: ${program.reward_description}` };
}

export default async function BusinessLandingPage({ params }: PageProps<"/n/[slug]">) {
  const { slug } = await params;
  const { business, program } = await loadPublicBusiness(slug);

  // Si el dispositivo ya tiene una tarjeta de este negocio, directo a ella.
  const session = await getCustomerSession(business.id);
  if (session) {
    const { data: card } = await createAdminClient()
      .from("cards")
      .select("access_token, status")
      .eq("id", session.cardId)
      .eq("business_id", business.id)
      .maybeSingle<{ access_token: string; status: string }>();
    if (card) redirect(`/t/${card.access_token}`);
  }

  const device = detectDevice(await userAgent());
  const suspended = business.status === "suspended";

  return (
    <div className="min-h-dvh bg-muted/40">
      <BrandHeader
        name={business.name}
        logoUrl={business.logo_url}
        primaryColor={business.primary_color}
        textColor={business.text_color}
        backgroundUrl={business.card_background_url}
        subtitle={`Junta ${program.stamps_required} sellos y obtén: ${program.reward_description}`}
      />
      <main className="mx-auto -mt-10 max-w-md space-y-4 px-4 pb-12">
        {device.inAppBrowser ? <InAppBrowserNotice app={device.inAppBrowser} platform={device.platform} /> : null}

        {suspended ? (
          <div className="rounded-2xl bg-background p-6 text-center shadow-sm">
            <p className="font-medium">Este negocio no está recibiendo inscripciones por ahora.</p>
          </div>
        ) : (
          <>
            <section className="rounded-2xl bg-background p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Crear mi tarjeta</h2>
              <p className="mb-4 text-sm text-muted-foreground">Sin apps ni contraseñas. Solo tu nombre, teléfono y un PIN.</p>
              <RegisterForm slug={business.slug} country={business.default_country} buttonColor={business.primary_color} buttonText={business.text_color} />
            </section>
            <Link
              href={`/n/${business.slug}/ingresar`}
              className="block rounded-2xl bg-background p-5 text-center font-medium shadow-sm transition-colors hover:bg-muted"
            >
              Ya tengo tarjeta →
            </Link>
          </>
        )}

        {device.platform === "desktop" ? (
          <section className="hidden rounded-2xl bg-background p-5 text-center shadow-sm sm:block">
            <p className="mb-3 text-sm text-muted-foreground">Escanea con tu celular para abrir esta página</p>
            <QRCodeSVG value={appUrl(`/n/${business.slug}`)} size={160} className="mx-auto" />
          </section>
        ) : null}

        <div className="flex justify-center pt-2">
          <PoweredByStamp />
        </div>
        <p className="text-center text-xs text-muted-foreground">
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
