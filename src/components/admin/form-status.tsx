"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface Props {
  error?: string;
  success?: string;
  manualLink?: string;
}

export function FormStatus({ error, success, manualLink }: Props) {
  const [copied, setCopied] = useState(false);
  if (!error && !success && !manualLink) return null;

  async function copy() {
    if (!manualLink) return;
    try {
      await navigator.clipboard.writeText(manualLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // portapapeles no disponible: el enlace queda visible para copiar a mano
    }
  }

  return (
    <div className="space-y-2" role="status">
      {error ? <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
      {success ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{success}</p> : null}
      {manualLink ? (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-2">
          <code className="min-w-0 flex-1 truncate text-xs">{manualLink}</code>
          <button
            type="button"
            onClick={copy}
            className="inline-flex shrink-0 items-center gap-1 rounded-md bg-background px-2 py-1 text-xs font-medium shadow-sm"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
