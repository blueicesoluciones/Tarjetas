import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PoweredByStamp } from "@/components/brand/logo";
import { BusinessLogo } from "@/components/customer/brand-header";
import { InAppBrowserNotice } from "@/components/customer/in-app-browser-notice";
import { cardBackgroundStyle } from "@/lib/cards/card-style";
import { getCardByAccessToken } from "@/lib/cards/public-card";
import { detectDevice } from "@/lib/domain/device";
import { encodeCardQr } from "@/lib/domain/qr";
import { userAgent } from "@/lib/request";
import { appleWallet, googleWallet } from "@/lib/wallet";
import { AutoRefresh } from "./auto-refresh";
import { CardQr } from "./card-qr";
import { StampGrid } from "@/components/customer/stamp-grid";
import { WalletActions } from "./wallet-actions";

export const metadata: Metadata = {
  title: "Mi tarjeta",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function WebCardPage({ params, searchParams }: PageProps<"/t/[accessToken]">) {
  const { accessToken } = await params;
  const { wallet } = await searchParams;
  const card = await getCardByAccessToken(accessToken);
  if (!card) notFound();

  const { business, program } = card;
  const device = detectDevice(await userAgent());
  const rewardAvailable = card.stampsCount >= program.stampsRequired;
  const remaining = Math.max(0, program.stampsRequired - card.stampsCount);

  return (
    <div className="min-h-dvh bg-muted/50 pb-12">
      <AutoRefresh intervalMs={20000} />
      <main className="mx-auto max-w-md space-y-4 px-4 pt-6">
        {device.inAppBrowser ? <InAppBrowserNotice app={device.inAppBrowser} platform={device.platform} /> : null}

        <article
          className="overflow-hidden rounded-3xl shadow-xl"
          style={{ ...cardBackgroundStyle(business.primaryColor, business.backgroundUrl), color: business.textColor }}
        >
          <div className="flex items-center gap-3 px-5 pt-5">
            <BusinessLogo
              name={business.name}
              logoUrl={business.logoUrl}
              primaryColor={business.primaryColor}
              textColor={business.textColor}
              size={44}
            />
            <div className="min-w-0">
              <p className="truncate text-sm opacity-80">{business.name}</p>
              <h1 className="truncate text-lg font-bold">{program.cardTitle}</h1>
            </div>
          </div>

          <div className="px-5 pt-4">
            <p className="text-xs tracking-wide uppercase opacity-70">Cliente</p>
            <p className="text-xl font-semibold">{card.customerName}</p>
          </div>

          <StampGrid
            count={card.stampsCount}
            required={program.stampsRequired}
            primaryColor={business.primaryColor}
            textColor={business.textColor}
          />

          <div className="flex items-end justify-between gap-3 px-5 pb-5">
            <div>
              <p className="text-3xl font-bold tabular-nums">
                {card.stampsCount}
                <span className="text-lg opacity-70"> / {program.stampsRequired}</span>
              </p>
              <p className="text-sm opacity-80">
                {rewardAvailable ? "¡Premio disponible! Muéstrale esta tarjeta al cajero." : `Te faltan ${remaining} para: ${program.rewardDescription}`}
              </p>
            </div>
          </div>

          <div className="bg-white px-5 py-6 text-center text-neutral-900">
            <CardQr value={encodeCardQr(card.publicCode)} />
            <p className="mt-2 font-mono text-xs tracking-widest text-neutral-500">{card.publicCode}</p>
            <p className="mt-1 text-xs text-neutral-500">Muestra este código en caja para sumar sellos</p>
          </div>
        </article>

        {rewardAvailable ? (
          <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-50 p-4 text-center text-emerald-900">
            <p className="text-lg font-bold">🎁 {program.rewardDescription}</p>
            <p className="text-sm">Pide tu premio en caja</p>
          </div>
        ) : null}

        {business.status === "suspended" ? (
          <p className="rounded-xl bg-amber-50 p-3 text-center text-sm text-amber-900">
            Este negocio pausó temporalmente su programa de sellos.
          </p>
        ) : null}
        {card.status === "blocked" ? (
          <p className="rounded-xl bg-red-50 p-3 text-center text-sm text-red-900">Esta tarjeta está bloqueada. Contacta al negocio.</p>
        ) : null}

        {wallet === "error" ? (
          <p role="alert" className="rounded-xl bg-amber-50 p-3 text-center text-sm text-amber-900">
            No pudimos agregar la tarjeta a Google Wallet en este momento. Tu tarjeta web sigue funcionando; intenta más tarde.
          </p>
        ) : null}

        <WalletActions
          accessToken={card.accessToken}
          serverPlatform={device.platform}
          googleEnabled={googleWallet.isEnabled()}
          appleEnabled={appleWallet.isEnabled()}
        />

        {card.totalRedemptions > 0 ? (
          <p className="text-center text-xs text-muted-foreground">Has canjeado {card.totalRedemptions} premio(s). ¡Gracias!</p>
        ) : null}
        <section className="rounded-2xl bg-background p-5 text-sm shadow-sm">
          <p className="font-semibold">¿Cómo vuelvo a ver mi tarjeta?</p>
          <ul className="mt-2 space-y-2 text-muted-foreground">
            <li>
              <strong className="text-foreground">Escanea de nuevo el QR de {business.name}</strong> (el del local o el que
              te compartieron): en este celular te trae directo aquí.
            </li>
            <li>
              O <strong className="text-foreground">guarda esta página</strong> en tus favoritos o en la pantalla de inicio.
            </li>
            <li>
              ¿Cambiaste de celular? Escanea el QR del negocio, toca{" "}
              <Link href={`/n/${business.slug}/ingresar`} className="font-medium text-foreground underline">
                Ya tengo tarjeta
              </Link>{" "}
              y entra con tu celular y tu PIN.
            </li>
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">Esta página es personal: no compartas su enlace.</p>
        </section>

        <div className="flex justify-center">
          <PoweredByStamp />
        </div>
      </main>
    </div>
  );
}
