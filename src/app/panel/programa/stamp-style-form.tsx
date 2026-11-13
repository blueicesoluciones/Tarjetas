"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import { StampGrid } from "@/components/customer/stamp-grid";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  resolveStampStyle,
  STAMP_ICON_LABELS,
  STAMP_ICON_SHAPES,
  STAMP_ICONS,
  type StampIcon,
} from "@/lib/cards/stamp-style";
import { cn } from "@/lib/utils";

/** Elige cómo se ven los sellos puestos: ícono, logo del negocio o imagen propia. */
export function StampStyleForm({
  icon,
  imageUrl,
  businessLogoUrl,
  primaryColor,
  textColor,
  stampsRequired,
  milestones,
}: {
  icon: StampIcon;
  imageUrl: string | null;
  businessLogoUrl: string | null;
  primaryColor: string;
  textColor: string;
  stampsRequired: number;
  milestones: number[];
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const preview = resolveStampStyle(true, icon, imageUrl);

  async function send(fd: FormData, label: string) {
    setBusy(label);
    setError(null);
    try {
      const res = await fetch("/panel/programa/sello", { method: "POST", body: fd });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !body.ok) setError(body.error ?? "No se pudo guardar el sello");
      else router.refresh();
    } catch {
      setError("Sin conexión");
    } finally {
      setBusy(null);
      if (input.current) input.current.value = "";
    }
  }

  function choose(next: StampIcon) {
    if (next === "image" && !imageUrl) {
      input.current?.click();
      return;
    }
    const fd = new FormData();
    fd.set("action", "icon");
    fd.set("icon", next);
    void send(fd, next);
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Diseño del sello</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 text-sm">
        <p className="text-muted-foreground">
          Elige qué se ve dentro de cada sello cuando tu cajero lo pone. Se actualiza en la tarjeta web y en
          Google y Apple Wallet.
        </p>

        <div
          role="radiogroup"
          aria-label="Diseño del sello"
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {STAMP_ICONS.map((option) => {
            const selected = option === icon && (option !== "image" || Boolean(imageUrl));
            const shape = option === "image" ? null : STAMP_ICON_SHAPES[option];
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={busy !== null}
                onClick={() => choose(option)}
                className={cn(
                  "focus-visible:ring-ring flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors outline-none focus-visible:ring-2 disabled:opacity-60",
                  selected ? "border-ink bg-lime/30 ring-ink ring-1" : "hover:bg-muted",
                )}
              >
                <span className="flex rounded-xl p-2" style={{ backgroundColor: primaryColor }}>
                  <span
                    className="flex size-12 items-center justify-center overflow-hidden rounded-full border-2"
                    style={{ borderColor: textColor, backgroundColor: textColor }}
                  >
                    {shape ? (
                      <svg viewBox="0 0 24 24" className="size-[55%]" aria-hidden>
                        <path
                          d={shape.d}
                          fill={shape.fill ? primaryColor : "none"}
                          stroke={shape.fill ? "none" : primaryColor}
                          strokeWidth={3.2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- imagen del sello guardada
                      <img src={imageUrl} alt="" className="size-full rounded-full object-cover" />
                    ) : (
                      <ImagePlus className="size-6" style={{ color: primaryColor }} aria-hidden />
                    )}
                  </span>
                </span>
                <span className="font-medium">
                  {busy === option ? "Guardando…" : STAMP_ICON_LABELS[option]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            ref={input}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            aria-label="Imagen del sello"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const fd = new FormData();
              fd.set("action", "upload");
              fd.set("file", file);
              void send(fd, "upload");
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy !== null}
            onClick={() => input.current?.click()}
          >
            {busy === "upload" ? "Subiendo…" : imageUrl ? "Cambiar imagen" : "Subir una imagen"}
          </Button>
          {businessLogoUrl ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy !== null}
              onClick={() => {
                const fd = new FormData();
                fd.set("action", "logo");
                void send(fd, "logo");
              }}
            >
              {busy === "logo" ? "Guardando…" : "Usar el logo de mi negocio"}
            </Button>
          ) : null}
        </div>
        {error ? <p className="text-destructive text-sm">{error}</p> : null}

        <div>
          <p className="text-muted-foreground mb-2 text-xs font-medium">Así se ve con 3 sellos</p>
          <div className="max-w-sm overflow-hidden rounded-2xl" style={{ backgroundColor: primaryColor }}>
            <StampGrid
              count={Math.min(3, stampsRequired)}
              required={stampsRequired}
              primaryColor={primaryColor}
              textColor={textColor}
              milestones={milestones}
              stamp={preview}
            />
          </div>
        </div>

        <p className="text-muted-foreground text-xs">
          La imagen se recorta en círculo automáticamente. Funciona mejor un ícono o una inicial que un logo
          con mucho texto. PNG, JPG o WEBP, máximo 5 MB. Con «Usar el logo de mi negocio» el logo se ve
          completo sobre un círculo blanco.
        </p>
      </CardContent>
    </Card>
  );
}
