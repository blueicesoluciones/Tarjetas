"use client";

import { useRef } from "react";
import { Copy, Download } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ShareQr({ url, fileName }: { url: string; fileName: string }) {
  const wrapper = useRef<HTMLDivElement>(null);

  function download() {
    const canvas = wrapper.current?.querySelector("canvas");
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = fileName;
    a.click();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Enlace copiado");
    } catch {
      toast.error("No se pudo copiar");
    }
  }

  return (
    <div className="space-y-4">
      <div ref={wrapper} className="flex justify-center rounded-xl bg-white p-4">
        {/* Canvas grande para una descarga nítida; se muestra reducido. */}
        <QRCodeCanvas value={url} size={1024} marginSize={2} level="M" style={{ width: 256, height: 256 }} />
      </div>
      <div className="flex items-center gap-2 rounded-lg bg-muted p-2">
        <p className="flex-1 truncate font-mono text-xs">{url}</p>
        <Button type="button" size="sm" variant="ghost" onClick={copy}>
          <Copy /> Copiar
        </Button>
      </div>
      <Button type="button" className="w-full" onClick={download}>
        <Download /> Descargar PNG
      </Button>
    </div>
  );
}
