"use client";

import { useState } from "react";
import { Check, Coffee, Gift } from "lucide-react";
import { cn } from "@/lib/utils";

const TOTAL = 8;
/** Arranca con avance: las tarjetas con sellos ya puestos se completan más. */
const START = 3;

const NOTICES: Record<number, { title: string; body: string }> = {
  [TOTAL - 1]: { title: "Café La Esquina", body: "¡Te falta 1 sello para tu café gratis!" },
  [TOTAL]: { title: "Café La Esquina", body: "¡Premio disponible! Pídelo en tu próxima visita." },
};

/**
 * Tarjeta de ejemplo que el visitante puede sellar. Muestra en pequeño lo que
 * pasa de verdad: el cajero suma, la tarjeta se llena y el aviso llega al celular.
 */
export function StampDemo() {
  const [stamps, setStamps] = useState(START);
  const full = stamps >= TOTAL;
  const notice = NOTICES[stamps];

  function press() {
    setStamps((n) => (n >= TOTAL ? 0 : n + 1));
  }

  return (
    <div className="relative mx-auto w-full max-w-[22rem]">
      {/* Aviso como llega a la pantalla de bloqueo */}
      <div className="h-[4.5rem]" aria-live="polite">
        {notice ? (
          <div
            key={stamps}
            className="ring-ink/5 flex items-start gap-3 rounded-2xl bg-white/90 p-3 shadow-[0_12px_30px_-12px_rgba(13,13,13,0.35)] ring-1 backdrop-blur motion-safe:animate-[notice-in_360ms_cubic-bezier(.2,.9,.3,1.2)]"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#3b2a20] text-[#f3e3c7]">
              <Coffee className="size-5" />
            </span>
            <span className="min-w-0 text-sm leading-snug">
              <span className="flex justify-between gap-2 font-semibold">
                {notice.title} <span className="text-muted-foreground font-normal">ahora</span>
              </span>
              <span className="text-ink/80 block">{notice.body}</span>
            </span>
          </div>
        ) : null}
      </div>

      {/* La tarjeta del cliente */}
      <div className="mt-3 rounded-[26px] bg-[#3b2a20] p-6 text-[#f3e3c7] shadow-[0_40px_70px_-30px_rgba(59,42,32,0.7)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex size-10 items-center justify-center rounded-full bg-[#f3e3c7] text-[#3b2a20]">
              <Coffee className="size-5" />
            </span>
            <div className="leading-tight">
              <p className="font-semibold">Café La Esquina</p>
              <p className="text-xs opacity-70">Laura Gómez</p>
            </div>
          </div>
          <p className="text-right text-xs leading-tight opacity-70">
            Sellos
            <br />
            <span className="text-lg font-semibold tabular-nums opacity-100">
              {stamps}/{TOTAL}
            </span>
          </p>
        </div>

        <ol className="mt-6 grid grid-cols-4 gap-3" aria-label={`${stamps} de ${TOTAL} sellos`}>
          {Array.from({ length: TOTAL }, (_, i) => {
            const filled = i < stamps;
            const last = i === TOTAL - 1;
            return (
              <li
                key={i}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-full border-2 transition-colors duration-300",
                  filled ? "border-[#f3e3c7] bg-[#f3e3c7] text-[#3b2a20]" : "border-[#f3e3c7]/35",
                )}
              >
                {filled ? (
                  <Check
                    key={`on-${i}`}
                    className="size-1/2 motion-safe:animate-[stamp-in_280ms_cubic-bezier(.2,.9,.3,1.4)]"
                    strokeWidth={3}
                  />
                ) : last ? (
                  <Gift className="size-1/2 opacity-50" />
                ) : null}
              </li>
            );
          })}
        </ol>

        <p className="mt-5 text-sm opacity-80">
          {full ? "¡Ganaste un café gratis!" : `Premio: un café gratis a los ${TOTAL} sellos`}
        </p>
      </div>

      {/* El botón del cajero */}
      <button
        type="button"
        onClick={press}
        className={cn(
          "focus-visible:ring-ink/30 mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-semibold transition-transform outline-none focus-visible:ring-4 active:scale-[0.98]",
          full ? "bg-violet text-white" : "bg-ink text-paper",
        )}
      >
        {full ? (
          <>
            <Gift className="size-5" /> Canjear premio
          </>
        ) : (
          "+1 sello"
        )}
      </button>
      <p className="text-ink/70 mt-2 text-center text-xs font-medium">
        Pruébalo: este es el botón que toca tu cajero.
      </p>
    </div>
  );
}
