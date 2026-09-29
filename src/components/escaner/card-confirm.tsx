"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Gift, Loader2, RotateCcw, ScanLine } from "lucide-react";
import type { CardState } from "@/types/db";
import { vibrate } from "./feedback";
import { useOnline } from "./offline-banner";

type Flash = { kind: "success" | "error" | "reward"; text: string } | null;

interface ApiResponse {
  ok: boolean;
  card?: CardState;
  error?: string;
  code?: string;
}

async function call(url: string, method: "GET" | "POST"): Promise<ApiResponse> {
  try {
    const res = await fetch(url, { method, cache: "no-store" });
    if (res.status === 401) return { ok: false, error: "Tu sesión venció. Vuelve a ingresar." };
    return (await res.json()) as ApiResponse;
  } catch {
    return { ok: false, error: "Sin conexión, no se pueden sumar sellos" };
  }
}

export function CardConfirm({ publicCode }: { publicCode: string }) {
  const online = useOnline();
  const [card, setCard] = useState<CardState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "stamp" | "redeem" | "undo">(null);
  const [flash, setFlash] = useState<Flash>(null);
  const [confirmRedeem, setConfirmRedeem] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    const res = await call(`/api/staff/cards/${encodeURIComponent(publicCode)}`, "GET");
    if (res.ok && res.card) {
      setCard(res.card);
      setLoadError(null);
    } else {
      setLoadError(res.error ?? "Tarjeta no encontrada");
      vibrate([80, 60, 80]);
    }
  }, [publicCode]);

  useEffect(() => {
    // Carga inicial desde la API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  // Reloj para la ventana de deshacer.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  async function stamp() {
    if (!card) return;
    setBusy("stamp");
    setFlash(null);
    const res = await call(`/api/staff/cards/${encodeURIComponent(card.public_code)}/stamp`, "POST");
    setBusy(null);
    if (res.ok && res.card) {
      const c = res.card;
      // El resumen trae el evento deshacible; add_stamp devuelve el event_id.
      setCard({ ...c, undoable_event: c.event_id ? { event_id: c.event_id, created_at: new Date().toISOString() } : null });
      vibrate(c.reward_available ? [60, 50, 60, 50, 120] : 80);
      setFlash(
        c.reward_available
          ? { kind: "reward", text: "¡Premio disponible!" }
          : { kind: "success", text: `${c.stamps_count} de ${c.stamps_required} sellos` },
      );
    } else {
      vibrate([80, 60, 80]);
      setFlash({ kind: "error", text: res.error ?? "No se pudo sumar el sello" });
    }
  }

  async function redeem() {
    if (!card) return;
    setBusy("redeem");
    setFlash(null);
    const res = await call(`/api/staff/cards/${card.card_id}/redeem`, "POST");
    setBusy(null);
    setConfirmRedeem(false);
    if (res.ok && res.card) {
      setCard({ ...res.card, undoable_event: null });
      vibrate(120);
      setFlash({ kind: "success", text: `Premio canjeado. Quedan ${res.card.stamps_count} sellos.` });
    } else {
      vibrate([80, 60, 80]);
      setFlash({ kind: "error", text: res.error ?? "No se pudo canjear" });
    }
  }

  async function undo() {
    const eventId = card?.undoable_event?.event_id;
    if (!eventId) return;
    setBusy("undo");
    const res = await call(`/api/staff/events/${eventId}/undo`, "POST");
    setBusy(null);
    if (res.ok && res.card) {
      setCard({ ...res.card, undoable_event: null });
      setFlash({ kind: "success", text: `Sello deshecho. ${res.card.stamps_count} de ${res.card.stamps_required}.` });
    } else {
      setFlash({ kind: "error", text: res.error ?? "No se pudo deshacer" });
      void load();
    }
  }

  if (loadError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <div className="rounded-2xl bg-red-600 p-6 text-xl font-semibold">{loadError}</div>
        <ScanAgain />
      </div>
    );
  }

  if (!card) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-10 animate-spin text-white/60" />
      </div>
    );
  }

  const undoDeadline = card.undoable_event
    ? new Date(card.undoable_event.created_at).getTime() + card.undo_window_minutes * 60_000
    : 0;
  const undoSecondsLeft = Math.max(0, Math.floor((undoDeadline - now) / 1000));
  const blocked = card.business_status === "suspended" || card.card_status !== "active";

  if (confirmRedeem) {
    return (
      <div className="flex flex-1 flex-col justify-center gap-6">
        <div className="rounded-3xl bg-white p-6 text-center text-neutral-900">
          <Gift className="mx-auto size-12 text-emerald-600" />
          <p className="mt-3 text-sm text-neutral-500">Confirma que el cliente es</p>
          <p className="text-3xl font-bold">{card.customer_name}</p>
          <p className="mt-4 text-sm text-neutral-500">Premio</p>
          <p className="text-xl font-semibold">{card.reward_description}</p>
        </div>
        <button
          type="button"
          onClick={redeem}
          disabled={busy !== null || !online}
          className="h-16 rounded-2xl bg-emerald-500 text-xl font-bold text-black disabled:opacity-50"
        >
          {busy === "redeem" ? "Canjeando…" : "Sí, canjear premio"}
        </button>
        <button type="button" onClick={() => setConfirmRedeem(false)} className="h-12 rounded-2xl bg-white/10 font-medium">
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <section className="rounded-3xl bg-white p-5 text-neutral-900">
        <p className="text-sm text-neutral-500">Cliente</p>
        <p className="text-2xl leading-tight font-bold">{card.customer_name}</p>
        <div className="mt-4 flex items-end justify-between">
          <p className="text-5xl font-bold tabular-nums">
            {card.stamps_count}
            <span className="text-2xl text-neutral-400"> / {card.stamps_required}</span>
          </p>
          {card.reward_available ? (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">Premio disponible</span>
          ) : null}
        </div>
        <StampDots count={card.stamps_count} required={card.stamps_required} />
        <p className="mt-3 text-xs text-neutral-500">
          {card.last_stamp_at ? `Último sello: ${formatRelative(card.last_stamp_at, now)}` : "Sin sellos todavía"}
        </p>
      </section>

      {flash ? (
        <div
          role="status"
          className={`rounded-2xl p-4 text-center text-xl font-bold ${
            flash.kind === "error" ? "bg-red-600" : flash.kind === "reward" ? "bg-emerald-400 text-black" : "bg-emerald-600"
          }`}
        >
          {flash.text}
        </div>
      ) : null}

      {blocked ? (
        <div className="rounded-2xl bg-amber-500 p-4 text-center font-semibold text-black">
          {card.business_status === "suspended" ? "Negocio suspendido: no se aceptan sellos" : "Tarjeta bloqueada"}
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={stamp}
            disabled={busy !== null || !online}
            className="h-20 rounded-3xl bg-yellow-400 text-3xl font-extrabold text-black shadow-lg active:scale-[0.98] disabled:opacity-50"
          >
            {busy === "stamp" ? "Sumando…" : "+1 sello"}
          </button>
          {card.reward_available ? (
            <button
              type="button"
              onClick={() => setConfirmRedeem(true)}
              disabled={busy !== null || !online}
              className="flex h-16 items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-xl font-bold text-black disabled:opacity-50"
            >
              <Gift className="size-6" /> Canjear premio
            </button>
          ) : null}
        </>
      )}

      {card.undoable_event && undoSecondsLeft > 0 ? (
        <button
          type="button"
          onClick={undo}
          disabled={busy !== null || !online}
          className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-white/10 font-medium disabled:opacity-50"
        >
          <RotateCcw className="size-5" /> {busy === "undo" ? "Deshaciendo…" : `Deshacer último sello (${formatCountdown(undoSecondsLeft)})`}
        </button>
      ) : null}

      <ScanAgain />
    </div>
  );
}

function StampDots({ count, required }: { count: number; required: number }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2" aria-hidden>
      {Array.from({ length: required }, (_, i) => (
        <span
          key={i}
          className={`size-6 rounded-full border-2 ${i < count ? "border-neutral-900 bg-neutral-900" : "border-neutral-300"}`}
        />
      ))}
    </div>
  );
}

function ScanAgain() {
  return (
    <Link
      href="/escaner"
      className="mt-auto flex h-14 items-center justify-center gap-2 rounded-2xl bg-white/10 text-lg font-semibold"
    >
      <ScanLine className="size-6" /> Escanear otra tarjeta
    </Link>
  );
}

function formatCountdown(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatRelative(iso: string, now: number) {
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "hace menos de un minuto";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return new Date(iso).toLocaleDateString("es");
}
