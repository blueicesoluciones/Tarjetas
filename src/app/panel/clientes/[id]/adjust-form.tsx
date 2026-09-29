"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdjustForm({ cardId }: { cardId: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState("1");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(sign: 1 | -1) {
    setError(null);
    const n = Number(amount);
    if (!Number.isInteger(n) || n < 1 || n > 100) return setError("Cantidad entre 1 y 100");
    if (!note.trim()) return setError("El motivo es obligatorio");
    setPending(true);
    try {
      const res = await fetch(`/api/staff/cards/${cardId}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta: sign * n, note: note.trim() }),
      });
      const body = (await res.json()) as { ok: boolean; error?: string; card?: { stamps_count: number } };
      if (!body.ok) return setError(body.error ?? "No se pudo ajustar");
      toast.success(`Ajuste guardado. Ahora tiene ${body.card?.stamps_count ?? "?"} sellos.`);
      setNote("");
      router.refresh();
    } catch {
      setError("Sin conexión");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Ajuste manual</p>
      <div className="flex gap-2">
        <div className="w-20 space-y-1">
          <Label htmlFor="adj-amount" className="text-xs text-muted-foreground">
            Sellos
          </Label>
          <Input id="adj-amount" type="number" min={1} max={100} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="flex-1 space-y-1">
          <Label htmlFor="adj-note" className="text-xs text-muted-foreground">
            Motivo (obligatorio)
          </Label>
          <Input
            id="adj-note"
            value={note}
            maxLength={200}
            placeholder="Ej. promoción martes doble"
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" disabled={pending} onClick={() => submit(1)}>
          + Sumar
        </Button>
        <Button type="button" variant="outline" className="flex-1" disabled={pending} onClick={() => submit(-1)}>
          − Restar
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
