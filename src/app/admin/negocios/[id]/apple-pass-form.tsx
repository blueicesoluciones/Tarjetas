"use client";

import { useActionState } from "react";
import { Download } from "lucide-react";
import { FormStatus } from "@/components/admin/form-status";
import { Button } from "@/components/ui/button";
import { prepareApplePassType, uploadApplePassCert, type ApplePassState } from "../apple-actions";

export interface ApplePassInfo {
  passTypeId: string;
  csrPem: string;
  /** ISO; null mientras falta subir el certificado. */
  expiresAt: string | null;
  /** Días que le quedan al certificado (calculado en el servidor). */
  daysLeft: number | null;
}

function downloadCsr(csrPem: string, slug: string) {
  const url = URL.createObjectURL(new Blob([csrPem], { type: "application/pkcs10" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug}.certSigningRequest`;
  a.click();
  URL.revokeObjectURL(url);
}

const APPLE_IDS = "https://developer.apple.com/account/resources/identifiers/add/passTypeId";
const APPLE_CERTS = "https://developer.apple.com/account/resources/certificates/add";

export function ApplePassForm({
  businessId,
  slug,
  suggested,
  sharedOwnerName,
  info,
}: {
  businessId: string;
  slug: string;
  suggested: string;
  /** Negocio que usa el identificador principal (si no es este). */
  sharedOwnerName: string | null;
  info: ApplePassInfo | null;
}) {
  const [prepState, prepare, preparing] = useActionState<ApplePassState, FormData>(
    prepareApplePassType.bind(null, businessId),
    {},
  );
  const [certState, upload, uploading] = useActionState<ApplePassState, FormData>(
    uploadApplePassCert.bind(null, businessId),
    {},
  );
  const active = info?.expiresAt != null;
  const daysLeft = info?.daysLeft ?? null;

  return (
    <div className="space-y-5 text-sm">
      {active ? (
        <div
          className={`rounded-lg px-4 py-3 ${daysLeft! <= 30 ? "border border-amber-300 bg-amber-50 text-amber-950" : "bg-emerald-50 text-emerald-950"}`}
        >
          <p>
            Identificador propio activo: <code className="font-mono font-semibold">{info!.passTypeId}</code>
          </p>
          <p className="mt-1">
            El certificado vence el{" "}
            {new Date(info!.expiresAt!).toLocaleDateString("es-CO", {
              dateStyle: "long",
              timeZone: "America/Bogota",
            })}
            {daysLeft! <= 30
              ? ` (en ${Math.max(daysLeft!, 0)} días). Renuévalo: en Apple crea otro certificado para el mismo identificador con la misma solicitud y súbelo aquí. Si vence, las tarjetas dejan de actualizarse.`
              : "."}
          </p>
        </div>
      ) : (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950">
          {sharedOwnerName
            ? `Este negocio aún no tiene identificador propio, así que sus clientes no pueden agregar tarjetas nuevas a Apple Wallet (el identificador principal es de ${sharedOwnerName}). Las que ya estaban guardadas se siguen actualizando. Configúralo con estos pasos.`
            : "Este negocio usa el identificador compartido: en el iPhone, sus tarjetas quedan en la misma pila que las de los demás negocios. Configura su identificador propio con estos pasos."}
        </p>
      )}

      {!active ? (
        <form action={prepare} className="space-y-2">
          <p className="font-semibold">1. Identificador del negocio</p>
          <div className="flex flex-wrap gap-2">
            <input
              name="passTypeId"
              defaultValue={info?.passTypeId ?? suggested}
              spellCheck={false}
              autoComplete="off"
              aria-label="Pass Type ID"
              className="bg-background h-9 w-full max-w-md rounded-lg border px-2.5 font-mono text-sm"
            />
            <Button type="submit" variant="outline" disabled={preparing}>
              {preparing ? "Generando…" : info ? "Generar de nuevo" : "Guardar y generar solicitud"}
            </Button>
          </div>
          <FormStatus error={prepState.error} success={prepState.success} />
        </form>
      ) : null}

      {info ? (
        <div className="space-y-2">
          <p className="font-semibold">
            {active ? "Solicitud del certificado (para renovarlo)" : "2. Descarga la solicitud"}
          </p>
          <Button type="button" variant="outline" onClick={() => downloadCsr(info.csrPem, slug)}>
            <Download /> {slug}.certSigningRequest
          </Button>
        </div>
      ) : null}

      {info && !active ? (
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>
            En{" "}
            <a href={APPLE_IDS} target="_blank" rel="noreferrer" className="underline">
              Apple Developer → Identifiers → +
            </a>{" "}
            elige <strong>Pass Type IDs</strong>, escribe una descripción (el nombre del negocio) y como
            identificador <code className="font-mono">{info.passTypeId}</code>. Continue → Register.
          </li>
          <li>
            En{" "}
            <a href={APPLE_CERTS} target="_blank" rel="noreferrer" className="underline">
              Certificates → +
            </a>{" "}
            elige <strong>Pass Type ID Certificate</strong>, selecciona{" "}
            <code className="font-mono">{info.passTypeId}</code>, sube el archivo .certSigningRequest de
            arriba y descarga el certificado (<code>pass.cer</code>).
          </li>
          <li>Súbelo aquí abajo.</li>
        </ol>
      ) : null}

      {info ? (
        <form action={upload} className="space-y-2">
          <p className="font-semibold">
            {active ? "Renovar certificado" : "3. Sube el certificado de Apple"}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input name="certificate" type="file" accept=".cer,.pem,.crt" required className="text-sm" />
            <Button type="submit" disabled={uploading}>
              {uploading ? "Subiendo…" : active ? "Subir certificado nuevo" : "Activar"}
            </Button>
          </div>
          <FormStatus error={certState.error} success={certState.success} />
          {!active ? (
            <p className="text-muted-foreground text-xs">
              Al activarlo, las tarjetas nuevas salen con este identificador. Quienes ya tenían la tarjeta
              reciben un aviso para agregar la nueva (con los mismos sellos), y la anterior queda anulada
              cuando la guardan.
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
