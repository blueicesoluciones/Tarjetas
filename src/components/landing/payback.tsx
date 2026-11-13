"use client";

import { useState } from "react";
import { formatCop, PLAN_ORDER, PLANS, type Plan } from "@/lib/plans";
import { cn } from "@/lib/utils";

const TICKETS = [8000, 15000, 25000, 40000, 60000];

/** Cuántas compras extra al mes cubren el plan, según el ticket promedio. */
export function Payback() {
  const [ticket, setTicket] = useState(15000);
  const [plan, setPlan] = useState<Plan>("medium");
  const price = PLANS[plan].priceCop;
  const visits = Math.ceil(price / ticket);
  const perDay = Math.ceil(price / 30 / 100) * 100;

  return (
    <div className="ring-ink/10 rounded-[28px] bg-white p-6 ring-1 sm:p-8">
      <fieldset>
        <legend className="text-sm font-medium">¿Cuánto gasta un cliente en cada visita?</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {TICKETS.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={ticket === t}
              onClick={() => setTicket(t)}
              className={cn(
                "focus-visible:ring-ink h-10 rounded-full px-4 text-sm font-medium tabular-nums ring-1 transition-colors outline-none focus-visible:ring-2",
                ticket === t ? "bg-ink text-paper ring-ink" : "ring-ink/15 hover:bg-ink/5",
              )}
            >
              {formatCop(t)}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-6">
        <legend className="text-sm font-medium">Plan</legend>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {PLAN_ORDER.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={plan === p}
              onClick={() => setPlan(p)}
              className={cn(
                "focus-visible:ring-ink h-10 rounded-full text-sm font-medium ring-1 transition-colors outline-none focus-visible:ring-2",
                plan === p ? "bg-ink text-paper ring-ink" : "ring-ink/15 hover:bg-ink/5",
              )}
            >
              {PLANS[p].label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="border-ink/10 mt-8 border-t pt-6" aria-live="polite">
        <p className="text-6xl font-semibold tracking-tight tabular-nums">{visits}</p>
        <p className="mt-2 text-lg leading-snug">
          {visits === 1 ? "compra extra al mes" : "compras extra al mes"} y el plan {PLANS[plan].label} ya
          está pago.
        </p>
        <p className="text-muted-foreground mt-2 text-sm">
          Son {formatCop(price)} al mes, unos {formatCop(perDay)} al día. Todo cliente que vuelva después de
          eso es venta para ti.
        </p>
      </div>
    </div>
  );
}
