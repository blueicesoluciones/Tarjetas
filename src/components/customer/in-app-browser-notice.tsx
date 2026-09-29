"use client";

import { useState } from "react";
import { Copy, ExternalLink } from "lucide-react";
import type { DevicePlatform } from "@/lib/domain/device";

export function InAppBrowserNotice({ app, platform }: { app: string; platform: DevicePlatform }) {
  const [copied, setCopied] = useState(false);
  const browser = platform === "ios" ? "Safari" : "Chrome";

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // el portapapeles puede no estar disponible en navegadores internos
    }
  }

  return (
    <div role="alert" className="rounded-xl border-2 border-amber-400 bg-amber-50 p-4 text-sm text-amber-950">
      <p className="flex items-center gap-2 font-semibold">
        <ExternalLink className="size-4" /> Estás en el navegador de {app}
      </p>
      <p className="mt-1">
        Para agregar tu tarjeta, toca <strong>⋯</strong> y elige <strong>Abrir en {browser}</strong>.
      </p>
      <button
        type="button"
        onClick={copy}
        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-400 px-3 py-2 font-medium text-amber-950"
      >
        <Copy className="size-4" /> {copied ? "¡Enlace copiado!" : "Copiar enlace"}
      </button>
    </div>
  );
}
