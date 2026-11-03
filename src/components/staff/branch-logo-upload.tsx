"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Logo de la sede: se ve dentro de cada sello puesto en ella. El servidor lo
 * recorta en círculo, así que sirve una imagen cuadrada o con fondo.
 */
export function BranchLogoUpload({
  branch,
  endpoint,
}: {
  branch: { id: string; name: string; logoUrl: string | null };
  /** Ruta que guarda el logo (admin o panel del dueño). */
  endpoint: string;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(init: RequestInit, url = endpoint) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, init);
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !body.ok) setError(body.error ?? "No se pudo guardar el logo");
      else router.refresh();
    } catch {
      setError("Sin conexión");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-1">
      <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted">
        {branch.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- vista previa del logo guardado
          <img src={branch.logoUrl} alt={`Logo de ${branch.name}`} className="size-full rounded-full object-cover" />
        ) : (
          <MapPin className="size-4 text-muted-foreground" aria-hidden />
        )}
      </span>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        aria-label={`Logo de ${branch.name}`}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const fd = new FormData();
          fd.set("branchId", branch.id);
          fd.set("file", file);
          void send({ method: "POST", body: fd });
        }}
      />
      <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? "Guardando…" : branch.logoUrl ? "Cambiar logo" : "Subir logo"}
      </Button>
      {branch.logoUrl ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() => {
            if (confirm(`¿Quitar el logo de ${branch.name}? Sus sellos volverán a verse con el chulo.`)) {
              void send({ method: "DELETE" }, `${endpoint}?branchId=${branch.id}`);
            }
          }}
        >
          Quitar
        </Button>
      ) : null}
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  );
}

