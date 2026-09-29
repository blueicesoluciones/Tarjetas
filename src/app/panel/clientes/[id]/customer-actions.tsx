"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

async function post<T>(url: string): Promise<T & { ok: boolean; error?: string }> {
  try {
    const res = await fetch(url, { method: "POST" });
    return (await res.json()) as T & { ok: boolean; error?: string };
  } catch {
    return { ok: false, error: "Sin conexión" } as T & { ok: boolean; error?: string };
  }
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copiado");
  } catch {
    toast.error("No se pudo copiar");
  }
}

export function ResetPinButton({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [tempPin, setTempPin] = useState<string | null>(null);

  async function reset() {
    setPending(true);
    const res = await post<{ tempPin?: string }>(`/api/staff/customers/${customerId}/reset-pin`);
    setPending(false);
    setConfirming(false);
    if (!res.ok || !res.tempPin) {
      toast.error(res.error ?? "No se pudo restablecer el PIN");
      return;
    }
    setTempPin(res.tempPin);
    router.refresh();
  }

  if (tempPin) {
    return (
      <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-4 text-amber-950">
        <p className="text-sm font-medium">PIN temporal</p>
        <p className="my-2 text-center font-mono text-4xl font-bold tracking-[0.4em]">{tempPin}</p>
        <p className="text-xs">
          Díselo al cliente. <strong>No se volverá a mostrar</strong> y vence en 24 horas. Al ingresar deberá crear un PIN nuevo.
        </p>
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => setTempPin(null)}>
          Ya se lo di, ocultar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">PIN</p>
      {confirming ? (
        <div className="space-y-2 rounded-lg bg-muted p-3 text-sm">
          <p>¿Verificaste la identidad del cliente? Se generará un PIN temporal y el actual dejará de funcionar.</p>
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={pending} onClick={reset}>
              {pending ? "Generando…" : "Sí, restablecer"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" className="w-full" onClick={() => setConfirming(true)}>
          Restablecer PIN
        </Button>
      )}
    </div>
  );
}

export function RegenerateLinkButton({ customerId }: { customerId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [url, setUrl] = useState<string | null>(null);

  async function regenerate() {
    setPending(true);
    const res = await post<{ url?: string }>(`/api/staff/customers/${customerId}/regenerate-link`);
    setPending(false);
    setConfirming(false);
    if (!res.ok || !res.url) {
      toast.error(res.error ?? "No se pudo regenerar el enlace");
      return;
    }
    setUrl(res.url);
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Enlace personal</p>
      {url ? (
        <div className="space-y-2 rounded-lg bg-muted p-3 text-sm">
          <p>Nuevo enlace de la tarjeta (el anterior ya no funciona):</p>
          <p className="font-mono text-xs break-all">{url}</p>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => copy(url)}>
              <Copy /> Copiar
            </Button>
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm underline self-center">
              Abrir tarjeta
            </a>
          </div>
        </div>
      ) : confirming ? (
        <div className="space-y-2 rounded-lg bg-muted p-3 text-sm">
          <p>El enlace actual dejará de funcionar. Úsalo si el cliente reporta que alguien más lo tiene.</p>
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={pending} onClick={regenerate}>
              {pending ? "Generando…" : "Regenerar"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" className="w-full" onClick={() => setConfirming(true)}>
          Regenerar enlace
        </Button>
      )}
    </div>
  );
}
