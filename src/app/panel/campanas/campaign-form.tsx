"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sendCampaign, type CampaignFormState } from "./actions";

export function CampaignForm({ businessName, audience, disabled }: { businessName: string; audience: number; disabled: boolean }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<CampaignFormState, FormData>(sendCampaign, {});
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (state.success) {
      toast.success(state.success);
      formRef.current?.reset();
      // El reinicio del formulario es un efecto sobre el DOM; se limpia el estado local a la par.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTitle("");
      setMessage("");
      const t = setTimeout(() => router.refresh(), 4000);
      return () => clearTimeout(t);
    }
    if (state.error) toast.error(state.error);
  }, [state, router]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <form
        ref={formRef}
        action={action}
        className="space-y-4"
        onSubmit={(e) => {
          if (!confirm(`¿Enviar este aviso a ${audience} ${audience === 1 ? "cliente" : "clientes"}? No se puede deshacer.`)) e.preventDefault();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="title">Título</Label>
          <Input id="title" name="title" maxLength={60} required placeholder="Ej. ¡Hoy 2x1 en capuchinos!" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="message">Mensaje</Label>
          <Textarea
            id="message"
            name="message"
            maxLength={300}
            required
            rows={4}
            placeholder="Ej. Solo por hoy, muestra tu tarjeta y lleva dos capuchinos por el precio de uno."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <p className="text-right text-xs text-muted-foreground">{message.length}/300</p>
        </div>
        <Button type="submit" size="lg" disabled={pending || disabled || audience === 0}>
          {pending ? "Enviando…" : `Enviar a ${audience} ${audience === 1 ? "cliente" : "clientes"}`}
        </Button>
      </form>

      <div>
        <p className="mb-2 text-sm font-medium">Así llega al celular</p>
        <div className="rounded-2xl bg-ink p-4 text-paper shadow-lg">
          <p className="text-xs text-paper/60">Google Wallet · {businessName}</p>
          <p className="mt-1 font-semibold">{title || "Título del aviso"}</p>
          <p className="mt-0.5 text-sm text-paper/80">{message || "El mensaje aparece aquí."}</p>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          También queda guardado dentro de la tarjeta en Google Wallet.
        </p>
      </div>
    </div>
  );
}
