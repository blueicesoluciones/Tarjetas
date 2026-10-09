"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BusinessLogo } from "@/components/customer/brand-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QRCodeSVG } from "qrcode.react";
import { StampGrid } from "@/components/customer/stamp-grid";
import { cardBackgroundStyle } from "@/lib/cards/card-style";
import { COMMON_COUNTRIES, COMMON_TIMEZONES, type ProgramFormValues } from "@/lib/panel/program-schema";
import { saveProgram, type ProgramFormState } from "./actions";

interface Props {
  programId: string;
  designVersion: number;
  logoUrl: string | null;
  backgroundUrl: string | null;
  initial: ProgramFormValues;
}

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function ProgramForm({ programId, designVersion, logoUrl, backgroundUrl, initial }: Props) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ProgramFormState, FormData>(saveProgram, {});
  const [v, setV] = useState(initial);
  const [previewCount, setPreviewCount] = useState(Math.min(3, initial.stampsRequired));
  const set = <K extends keyof ProgramFormValues>(k: K, value: ProgramFormValues[K]) => setV((s) => ({ ...s, [k]: value }));
  const fe = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.success) {
      toast.success("Cambios guardados");
      router.refresh();
    } else if (state.error) toast.error(state.error);
  }, [state, router]);

  const required = Math.min(30, Math.max(2, Number(v.stampsRequired) || 2));
  const count = Math.min(previewCount, required);

  const timezones = COMMON_TIMEZONES.includes(v.timezone) ? COMMON_TIMEZONES : [v.timezone, ...COMMON_TIMEZONES];
  const countries = COMMON_COUNTRIES.some(([c]) => c === v.defaultCountry)
    ? COMMON_COUNTRIES
    : [[v.defaultCountry, v.defaultCountry] as [string, string], ...COMMON_COUNTRIES];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <form action={action} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Reglas de la tarjeta</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Título de la tarjeta" error={fe.cardTitle} className="sm:col-span-2">
              <Input name="cardTitle" value={v.cardTitle} maxLength={80} onChange={(e) => set("cardTitle", e.target.value)} />
            </Field>
            <Field label="Sellos para el premio (2–30)" error={fe.stampsRequired}>
              <Input
                name="stampsRequired"
                type="number"
                min={2}
                max={30}
                value={v.stampsRequired}
                onChange={(e) => set("stampsRequired", Number(e.target.value))}
              />
            </Field>
            <Field label="Premio" error={fe.rewardDescription}>
              <Input
                name="rewardDescription"
                value={v.rewardDescription}
                maxLength={200}
                onChange={(e) => set("rewardDescription", e.target.value)}
              />
            </Field>
            <Field
              label="Tiempo mínimo entre sellos (minutos)"
              hint="0 = sin límite. Evita dos sellos seguidos a la misma tarjeta."
              error={fe.stampCooldownMinutes}
            >
              <Input
                name="stampCooldownMinutes"
                type="number"
                min={0}
                value={v.stampCooldownMinutes}
                onChange={(e) => set("stampCooldownMinutes", Number(e.target.value))}
              />
            </Field>
            <Field label="Ventana para deshacer (minutos)" error={fe.undoWindowMinutes}>
              <Input
                name="undoWindowMinutes"
                type="number"
                min={0}
                max={1440}
                value={v.undoWindowMinutes}
                onChange={(e) => set("undoWindowMinutes", Number(e.target.value))}
              />
            </Field>
            {initial.stampsRequired !== required ? (
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 sm:col-span-2">
                Cambiar la cantidad de sellos afecta a todas las tarjetas actuales: los clientes conservan sus sellos, pero la meta
                pasa a ser {required}.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Marca</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre del negocio" error={fe.businessName} className="sm:col-span-2">
              <Input name="businessName" value={v.businessName} maxLength={120} onChange={(e) => set("businessName", e.target.value)} />
            </Field>
            <ColorField label="Color principal" name="primaryColor" value={v.primaryColor} error={fe.primaryColor} onChange={(c) => set("primaryColor", c)} />
            <ColorField label="Color del texto" name="textColor" value={v.textColor} error={fe.textColor} onChange={(c) => set("textColor", c)} />
            <Field label="WhatsApp de contacto (opcional)" hint="Se muestra en “Olvidé mi PIN”." error={fe.contactWhatsapp}>
              <Input
                name="contactWhatsapp"
                type="tel"
                value={v.contactWhatsapp}
                onChange={(e) => set("contactWhatsapp", e.target.value)}
              />
            </Field>
            <Field label="País (teléfonos)" error={fe.defaultCountry}>
              <select name="defaultCountry" className={selectClass} value={v.defaultCountry} onChange={(e) => set("defaultCountry", e.target.value)}>
                {countries.map(([code, name]) => (
                  <option key={code} value={code}>
                    {name} ({code})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Zona horaria" error={fe.timezone} className="sm:col-span-2">
              <select name="timezone" className={selectClass} value={v.timezone} onChange={(e) => set("timezone", e.target.value)}>
                {timezones.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </Field>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Guardando…" : "Guardar cambios"}
          </Button>
          <p className="text-xs text-muted-foreground">Los cambios de diseño se aplican también a las tarjetas en Google Wallet.</p>
        </div>
      </form>

      <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <p className="text-sm font-medium">Vista previa</p>
        <CardPreview values={v} required={required} count={count} logoUrl={logoUrl} backgroundUrl={backgroundUrl} />
        <div className="flex items-center gap-3 text-sm">
          <Label htmlFor="preview-count" className="shrink-0 text-muted-foreground">
            Sellos de ejemplo
          </Label>
          <input
            id="preview-count"
            type="range"
            min={0}
            max={required}
            value={count}
            onChange={(e) => setPreviewCount(Number(e.target.value))}
            className="flex-1"
          />
          <span className="w-10 text-right tabular-nums">{count}</span>
        </div>
        <BackgroundPicker backgroundUrl={backgroundUrl} />
        <LogoUpload hasLogo={Boolean(logoUrl)} />
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">Imagen guardada (Google Wallet)</summary>
          {/* eslint-disable-next-line @next/next/no-img-element -- imagen dinámica */}
          <img
            src={`/api/img/stamps/${programId}/${Math.min(count, initial.stampsRequired)}?v=${designVersion}`}
            alt="Imagen de sellos guardada"
            className="mt-2 w-full rounded-lg border"
          />
          <p className="mt-1 text-xs text-muted-foreground">Refleja los valores guardados, no los cambios sin guardar.</p>
        </details>
      </aside>
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function ColorField({
  label,
  name,
  value,
  error,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  error?: string;
  onChange: (v: string) => void;
}) {
  const safe = /^#[0-9A-Fa-f]{6}$/.test(value) ? value : "#000000";
  return (
    <Field label={label} error={error}>
      <div className="flex gap-2">
        <input
          type="color"
          aria-label={label}
          value={safe}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-9 w-12 cursor-pointer rounded-lg border bg-transparent p-1"
        />
        <Input name={name} value={value} maxLength={7} onChange={(e) => onChange(e.target.value)} className="font-mono uppercase" />
      </div>
    </Field>
  );
}

const SAMPLE_CODE = "EJEMPLO00000001";

/** Vista previa vertical en un marco de celular: tarjeta web o Google Wallet. */
function CardPreview({
  values,
  required,
  count,
  logoUrl,
  backgroundUrl,
}: {
  values: ProgramFormValues;
  required: number;
  count: number;
  logoUrl: string | null;
  backgroundUrl: string | null;
}) {
  const [tab, setTab] = useState<"web" | "wallet" | "apple">("web");
  const bg = /^#[0-9A-Fa-f]{6}$/.test(values.primaryColor) ? values.primaryColor : "#0D0D0D";
  const fg = /^#[0-9A-Fa-f]{6}$/.test(values.textColor) ? values.textColor : "#FFFFFF";
  const name = values.businessName || "Tu negocio";
  const previewProps: PreviewProps = { values, name, bg, fg, required, count, logoUrl, backgroundUrl };

  return (
    <div className="space-y-3">
      <div role="tablist" className="grid grid-cols-3 rounded-full bg-muted p-1 text-xs">
        {(
          [
            ["web", "Tarjeta web"],
            ["wallet", "Google Wallet"],
            ["apple", "Apple Wallet"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`rounded-full px-2 py-1.5 font-medium whitespace-nowrap transition-colors ${
              tab === id ? "bg-background shadow-sm" : "text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mx-auto w-full max-w-[320px] rounded-[2.6rem] bg-ink p-2.5 shadow-xl">
        <div className="h-[600px] overflow-y-auto rounded-[2.1rem] bg-[#f2f1ee] px-3 pt-8 pb-6 [scrollbar-width:none]">
          {tab === "web" ? (
            <WebCardPreview {...previewProps} />
          ) : tab === "wallet" ? (
            <WalletPreview {...previewProps} />
          ) : (
            <ApplePreview {...previewProps} />
          )}
        </div>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        {tab === "web"
          ? "Así la ve tu cliente al abrir su tarjeta."
          : tab === "wallet"
            ? "Aproximación: Google define la tipografía y el orden exacto. La parte superior siempre es de color sólido."
            : "Aproximación del diseño en iPhone. Se activa cuando Apple apruebe la cuenta de desarrollador."}
      </p>
    </div>
  );
}

interface PreviewProps {
  values: ProgramFormValues;
  name: string;
  bg: string;
  fg: string;
  required: number;
  count: number;
  logoUrl: string | null;
  backgroundUrl: string | null;
}

function WebCardPreview({ values, name, bg, fg, required, count, logoUrl, backgroundUrl }: PreviewProps) {
  const reward = count >= required;
  return (
    <article className="overflow-hidden rounded-3xl shadow-lg" style={{ ...cardBackgroundStyle(bg, backgroundUrl), color: fg }}>
      <div className="flex items-center gap-2.5 px-4 pt-4">
        <BusinessLogo name={name} logoUrl={logoUrl} primaryColor={bg} textColor={fg} size={36} />
        <div className="min-w-0">
          <p className="truncate text-[11px] opacity-80">{name}</p>
          <p className="truncate text-sm font-bold">{values.cardTitle}</p>
        </div>
      </div>
      <div className="px-4 pt-3">
        <p className="text-[9px] tracking-wide uppercase opacity-70">Cliente</p>
        <p className="text-sm font-semibold">Camila Rojas</p>
      </div>
      <StampGrid count={count} required={required} primaryColor={bg} textColor={fg} />
      <div className="px-4 pb-4">
        <p className="text-xl font-bold tabular-nums">
          {count}
          <span className="text-sm opacity-70"> / {required}</span>
        </p>
        <p className="text-xs opacity-80">
          {reward ? "¡Premio disponible! Muéstrale esta tarjeta al cajero." : `Te faltan ${required - count} para: ${values.rewardDescription}`}
        </p>
      </div>
      <div className="bg-white px-4 py-5 text-center text-neutral-900">
        <QRCodeSVG value={`LC1:${SAMPLE_CODE}`} size={132} level="M" marginSize={0} className="mx-auto" />
        <p className="mt-2 font-mono text-[10px] tracking-widest text-neutral-500">{SAMPLE_CODE}</p>
        <p className="mt-0.5 text-[10px] text-neutral-500">Muestra este código en caja para sumar sellos</p>
      </div>
    </article>
  );
}

function WalletPreview({ values, name, bg, fg, required, count, logoUrl, backgroundUrl }: PreviewProps) {
  return (
    <article className="overflow-hidden rounded-3xl shadow-lg" style={{ backgroundColor: bg, color: fg }}>
      <div className="flex items-center gap-2.5 px-4 pt-4">
        <BusinessLogo name={name} logoUrl={logoUrl} primaryColor={bg} textColor={fg} size={30} />
        <p className="truncate text-sm font-medium">{name}</p>
      </div>
      <p className="px-4 pt-4 text-lg leading-tight font-semibold">{values.cardTitle}</p>
      <div className="flex justify-between px-4 pt-4 text-xs">
        <div>
          <p className="opacity-70">Sellos</p>
          <p className="text-sm font-semibold tabular-nums">
            {count} / {required}
          </p>
        </div>
        <div className="text-right">
          <p className="opacity-70">Cliente</p>
          <p className="text-sm font-semibold">Camila Rojas</p>
        </div>
      </div>
      <div className="mx-auto mt-5 w-fit rounded-xl bg-white p-2.5">
        <QRCodeSVG value={`LC1:${SAMPLE_CODE}`} size={112} level="M" marginSize={0} />
      </div>
      <p className="pt-1.5 pb-5 text-center text-[10px] opacity-80">{SAMPLE_CODE}</p>
      {/* Imagen destacada (hero): igual que /api/img/stamps, con el fundido superior. */}
      <div
        className="relative -mt-px aspect-[1032/336] w-full"
        style={
          backgroundUrl
            ? {
                backgroundImage: `linear-gradient(to bottom, ${bg} 0%, ${bg}E6 18%, ${bg}00 70%), linear-gradient(${bg}A6, ${bg}A6), url("${backgroundUrl}")`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : { backgroundColor: bg }
        }
      >
        <div className="absolute inset-0 flex items-center px-2">
          <StampGrid count={count} required={required} primaryColor={bg} textColor={fg} />
        </div>
      </div>
    </article>
  );
}

/**
 * Apple Wallet (pase storeCard): encabezado con logo y sellos, franja de imagen
 * (strip, 375×144) con los sellos, campos de cliente y premio, y el QR abajo.
 */
function ApplePreview({ values, name, bg, fg, required, count, logoUrl, backgroundUrl }: PreviewProps) {
  return (
    <article className="overflow-hidden rounded-2xl shadow-lg" style={{ backgroundColor: bg, color: fg }}>
      <div className="flex items-center gap-2 px-3 pt-3 pb-2.5">
        <BusinessLogo name={name} logoUrl={logoUrl} primaryColor={bg} textColor={fg} size={26} />
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{name}</p>
        <div className="text-right">
          <p className="text-[9px] font-semibold tracking-wide uppercase opacity-75">Sellos</p>
          <p className="text-sm font-semibold tabular-nums">
            {count} / {required}
          </p>
        </div>
      </div>
      <div
        className="relative aspect-[375/144] w-full"
        style={
          backgroundUrl
            ? {
                backgroundImage: `linear-gradient(${bg}A6, ${bg}A6), url("${backgroundUrl}")`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : { backgroundColor: bg }
        }
      >
        <div className="absolute inset-0 flex items-center px-1">
          <StampGrid count={count} required={required} primaryColor={bg} textColor={fg} />
        </div>
      </div>
      <div className="flex justify-between gap-3 px-3 pt-3 text-left">
        <div className="min-w-0">
          <p className="text-[9px] font-semibold tracking-wide uppercase opacity-75">Cliente</p>
          <p className="truncate text-sm">Camila Rojas</p>
        </div>
        <div className="min-w-0 text-right">
          <p className="text-[9px] font-semibold tracking-wide uppercase opacity-75">Premio</p>
          <p className="truncate text-sm">{values.rewardDescription}</p>
        </div>
      </div>
      <p className="px-3 pt-2 text-[11px] font-medium opacity-90">{values.cardTitle}</p>
      <div className="mx-auto mt-4 mb-4 w-fit rounded-lg bg-white p-2.5 text-center text-neutral-900">
        <QRCodeSVG value={`LC1:${SAMPLE_CODE}`} size={110} level="M" marginSize={0} />
        <p className="mt-1 font-mono text-[9px] tracking-widest text-neutral-500">{SAMPLE_CODE}</p>
      </div>
    </article>
  );
}

/** Sube o quita una imagen (logo o fondo) y refresca la página. */
function useImageUpload(kind: "logo" | "background", maxMb: number) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function upload(file: File) {
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(`La imagen supera ${maxMb} MB`);
      return;
    }
    setPending(true);
    const form = new FormData();
    form.append("kind", kind);
    form.append("file", file);
    try {
      const res = await fetch("/panel/programa/logo", { method: "POST", body: form });
      const body = (await res.json()) as { ok: boolean; error?: string };
      if (body.ok) {
        toast.success(kind === "logo" ? "Logo actualizado" : "Fondo actualizado");
        router.refresh();
      } else toast.error(body.error ?? "No se pudo subir la imagen");
    } catch {
      toast.error("Sin conexión");
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    setPending(true);
    try {
      const res = await fetch(`/panel/programa/logo?kind=${kind}`, { method: "DELETE" });
      const body = (await res.json()) as { ok: boolean; error?: string };
      if (body.ok) {
        toast.success(kind === "logo" ? "Logo quitado" : "Ahora el fondo es de color sólido");
        router.refresh();
      } else toast.error(body.error ?? "No se pudo quitar la imagen");
    } catch {
      toast.error("Sin conexión");
    } finally {
      setPending(false);
    }
  }

  return { pending, upload, remove };
}

function FilePickerButton({
  accept,
  label,
  pending,
  onFile,
}: {
  accept: string;
  label: string;
  pending: boolean;
  onFile: (f: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      <Button type="button" variant="outline" disabled={pending} onClick={() => inputRef.current?.click()}>
        {pending ? "Subiendo…" : label}
      </Button>
    </>
  );
}

function BackgroundPicker({ backgroundUrl }: { backgroundUrl: string | null }) {
  const { pending, upload, remove } = useImageUpload("background", 5);
  const [mode, setMode] = useState<"color" | "image">(backgroundUrl ? "image" : "color");

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div>
        <p className="text-sm font-medium">Fondo de la tarjeta</p>
        <p className="text-xs text-muted-foreground">Se usa en la tarjeta web, en tu página de inscripción y en la franja de sellos de Google Wallet y Apple Wallet.</p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {(
          [
            ["color", "Color sólido"],
            ["image", "Imagen"],
          ] as const
        ).map(([value, label]) => (
          <label
            key={value}
            className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 ${
              mode === value ? "border-foreground bg-muted font-medium" : "text-muted-foreground"
            }`}
          >
            <input
              type="radio"
              name="background-mode"
              value={value}
              checked={mode === value}
              onChange={() => {
                setMode(value);
                if (value === "color" && backgroundUrl) void remove();
              }}
              className="sr-only"
            />
            {label}
          </label>
        ))}
      </div>
      {mode === "color" ? (
        <p className="text-xs text-muted-foreground">Se usa el «Color principal» de la sección Marca.</p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            PNG o JPG, máximo 5 MB. Ideal horizontal (por ejemplo 1200×800). Se tiñe con tu color principal para que el texto se lea bien.
          </p>
          <FilePickerButton
            accept="image/png,image/jpeg"
            label={backgroundUrl ? "Cambiar imagen" : "Subir imagen"}
            pending={pending}
            onFile={upload}
          />
        </div>
      )}
    </div>
  );
}

function LogoUpload({ hasLogo }: { hasLogo: boolean }) {
  const { pending, upload, remove } = useImageUpload("logo", 2);
  return (
    <div className="rounded-xl border p-4">
      <p className="text-sm font-medium">Logo</p>
      <p className="mb-3 text-xs text-muted-foreground">PNG, JPG o WEBP, máximo 2 MB. Idealmente cuadrado.</p>
      <div className="flex flex-wrap gap-2">
        <FilePickerButton
          accept="image/png,image/jpeg,image/webp"
          label={hasLogo ? "Cambiar logo" : "Subir logo"}
          pending={pending}
          onFile={upload}
        />
        {hasLogo ? (
          <Button type="button" variant="ghost" disabled={pending} onClick={remove}>
            Quitar
          </Button>
        ) : null}
      </div>
    </div>
  );
}
