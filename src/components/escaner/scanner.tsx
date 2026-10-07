"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Flashlight, RefreshCw } from "lucide-react";
import type { Html5Qrcode } from "html5-qrcode";
import { INVALID_QR_MESSAGE, parseCardQr } from "@/lib/domain/qr";
import { vibrate } from "./feedback";

const ELEMENT_ID = "qr-reader";

type Status = "starting" | "scanning" | "denied" | "error";

export function Scanner() {
  const router = useRouter();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handledRef = useRef(false);
  const [status, setStatus] = useState<Status>("starting");
  const [invalid, setInvalid] = useState<string | null>(null);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const onDecode = useCallback(
    (text: string) => {
      if (handledRef.current) return;
      const code = parseCardQr(text);
      if (!code) {
        setInvalid(INVALID_QR_MESSAGE);
        vibrate([80, 60, 80]);
        return;
      }
      handledRef.current = true;
      vibrate(60);
      scannerRef.current?.pause(true);
      router.push(`/escaner/tarjeta/${encodeURIComponent(code)}`);
    },
    [router],
  );

  const start = useCallback(async () => {
    setStatus("starting");
    setInvalid(null);
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(ELEMENT_ID, {
          verbose: false,
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          useBarCodeDetectorIfSupported: false,
        });
      }
      await scannerRef.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: (w, h) => ({ width: Math.floor(Math.min(w, h) * 0.7), height: Math.floor(Math.min(w, h) * 0.7) }) },
        onDecode,
        () => {},
      );
      setStatus("scanning");
      try {
        setTorchSupported(scannerRef.current.getRunningTrackCameraCapabilities().torchFeature().isSupported());
      } catch {
        setTorchSupported(false);
      }
    } catch (err) {
      const name = (err as { name?: string })?.name ?? String(err);
      setStatus(/NotAllowed|Permission/i.test(name) ? "denied" : "error");
    }
  }, [onDecode]);

  useEffect(() => {
    handledRef.current = false;
    // Iniciar la cámara es sincronizar con un sistema externo.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void start();
    return () => {
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s?.isScanning) s.stop().then(() => s.clear()).catch(() => {});
    };
  }, [start]);

  useEffect(() => {
    if (!invalid) return;
    const t = setTimeout(() => setInvalid(null), 2500);
    return () => clearTimeout(t);
  }, [invalid]);

  async function toggleTorch() {
    try {
      const next = !torchOn;
      await scannerRef.current?.getRunningTrackCameraCapabilities().torchFeature().apply(next);
      setTorchOn(next);
    } catch {
      setTorchSupported(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="relative overflow-hidden rounded-3xl bg-black">
        <div id={ELEMENT_ID} className="aspect-square w-full [&_video]:!h-full [&_video]:!w-full [&_video]:object-cover" />
        {status === "starting" ? (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-white/70">Abriendo cámara…</p>
        ) : null}
        {torchSupported ? (
          <button
            type="button"
            onClick={toggleTorch}
            aria-pressed={torchOn}
            aria-label="Linterna"
            className={`absolute right-3 bottom-3 rounded-full p-3 ${torchOn ? "bg-lime text-black" : "bg-black/60 text-white"}`}
          >
            <Flashlight className="size-6" />
          </button>
        ) : null}
      </div>

      {invalid ? (
        <div role="alert" className="rounded-2xl bg-red-600 p-4 text-center text-lg font-semibold">
          {invalid}
        </div>
      ) : null}

      {status === "scanning" ? (
        <p className="text-center text-white/70">Apunta al código QR de la tarjeta del cliente</p>
      ) : null}

      {status === "denied" ? (
        <div className="space-y-3 rounded-2xl bg-white/10 p-5 text-center">
          <p className="text-lg font-semibold">Necesitamos permiso para usar la cámara</p>
          <p className="text-sm text-white/70">
            En iPhone: Ajustes → Safari → Cámara → Permitir. En Android: toca el candado junto a la dirección y permite la cámara.
          </p>
          <RetryButton onClick={start} />
        </div>
      ) : null}
      {status === "error" ? (
        <div className="space-y-3 rounded-2xl bg-white/10 p-5 text-center">
          <p className="text-lg font-semibold">No pudimos abrir la cámara</p>
          <RetryButton onClick={start} />
        </div>
      ) : null}

      <Link href="/escaner/buscar" className="rounded-2xl bg-white/10 p-4 text-center text-lg font-medium">
        Buscar cliente por teléfono o nombre
      </Link>
    </div>
  );
}

function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-black">
      <RefreshCw className="size-5" /> Reintentar
    </button>
  );
}
