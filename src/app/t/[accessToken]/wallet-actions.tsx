"use client";

import { useState, useSyncExternalStore } from "react";
import type { DevicePlatform } from "@/lib/domain/device";

interface Props {
  accessToken: string;
  serverPlatform: DevicePlatform;
  googleEnabled: boolean;
  appleEnabled: boolean;
}

export function WalletActions({ accessToken, serverPlatform, googleEnabled, appleEnabled }: Props) {
  const [showOther, setShowOther] = useState(false);
  // iPadOS se reporta como Mac: en el cliente se refuerza con la pantalla táctil.
  const platform = useSyncExternalStore<DevicePlatform>(
    noopSubscribe,
    () =>
      serverPlatform === "desktop" && /Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1
        ? "ios"
        : serverPlatform,
    () => serverPlatform,
  );

  // Botón oficial de Google (es-419), sin modificar, según sus lineamientos de
  // marca: alto mínimo 48 px y 8 px de espacio libre alrededor.
  const google = (
    <a key="google" href={`/api/wallet/google/save/${accessToken}`} className="mx-auto block w-fit p-2">
      {/* eslint-disable-next-line @next/next/no-img-element -- recurso oficial SVG */}
      <img
        src="/wallet/add-to-google-wallet-es419.svg"
        alt="Agregar a la Billetera de Google"
        width={378}
        height={50}
        className="h-[52px] w-auto max-w-full"
      />
    </a>
  );

  const apple = appleEnabled ? (
    <a
      key="apple"
      href={`/api/apple/pass/${accessToken}`}
      className="flex h-12 items-center justify-center rounded-full bg-black px-5 font-medium text-white"
    >
      Agregar a Apple Wallet
    </a>
  ) : (
    <div key="apple" className="rounded-2xl bg-background p-4 text-sm shadow-sm">
      <p className="font-semibold">Ten tu tarjeta a mano en tu iPhone</p>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
        <li>Abre esta página en Safari.</li>
        <li>
          Toca el botón <strong>Compartir</strong> (el cuadrado con la flecha).
        </li>
        <li>
          Elige <strong>Añadir a pantalla de inicio</strong>.
        </li>
      </ol>
    </div>
  );

  // Celular: el botón de su plataforma y la otra opción bajo «¿Otro teléfono?».
  // Computador: ambas opciones visibles (Google Wallet no existe en iPhone).
  const primary = platform === "android" ? (googleEnabled ? google : null) : platform === "ios" ? apple : null;
  const other = platform === "android" ? apple : googleEnabled ? google : null;

  if (platform === "desktop") {
    return (
      <section className="space-y-3 rounded-2xl bg-background p-5 shadow-sm">
        <p className="text-center font-semibold">Lleva tu tarjeta en el celular</p>
        {googleEnabled ? (
          <div className="space-y-1">
            <p className="text-center text-sm text-muted-foreground">En Android</p>
            {google}
          </div>
        ) : null}
        <div className="space-y-1">
          <p className="text-center text-sm text-muted-foreground">En iPhone</p>
          {apple}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      {primary}
      {other ? (
        <>
          <button
            type="button"
            onClick={() => setShowOther((v) => !v)}
            className="w-full text-center text-sm text-muted-foreground underline"
          >
            ¿Otro teléfono?
          </button>
          {showOther ? other : null}
        </>
      ) : null}
    </section>
  );
}

function noopSubscribe() {
  return () => {};
}
