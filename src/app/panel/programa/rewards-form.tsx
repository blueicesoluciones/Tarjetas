"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Gift, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MAX_MILESTONES, type Milestone } from "@/lib/rewards";
import { saveRewards, type RewardsFormState } from "./rewards-actions";

export function RewardsForm({
  initial,
  stampsRequired,
  finalReward,
}: {
  initial: Milestone[];
  stampsRequired: number;
  finalReward: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<RewardsFormState, FormData>(saveRewards, {});
  const [rows, setRows] = useState<Milestone[]>(initial);

  useEffect(() => {
    if (state.success) {
      toast.success(state.success);
      router.refresh();
    } else if (state.error) toast.error(state.error);
  }, [state, router]);

  const update = (i: number, patch: Partial<Milestone>) => setRows((r) => r.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  const add = () => {
    const used = new Set(rows.map((m) => m.stampsAt));
    const suggestion =
      [Math.floor(stampsRequired / 2), ...Array.from({ length: stampsRequired - 1 }, (_, i) => i + 1)].find(
        (n) => n >= 1 && !used.has(n),
      ) ?? 1;
    setRows((r) => [...r, { stampsAt: suggestion, description: "" }]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Premios en el camino</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Además del premio final, regala algo antes de completar la tarjeta. Ej.: a los 5 sellos un descuento y a los{" "}
            {stampsRequired} el premio. Entregar un premio intermedio no descuenta sellos; al canjear el premio final la
            tarjeta empieza de nuevo.
          </p>
          <input type="hidden" name="rewards" value={JSON.stringify(rows)} />
          <ul className="space-y-2">
            {rows.map((m, i) => (
              <li key={i} className="flex items-center gap-2">
                <Gift className="size-4 shrink-0 text-muted-foreground" />
                <label className="flex shrink-0 items-center gap-1.5 text-sm">
                  A los
                  <input
                    type="number"
                    min={1}
                    max={stampsRequired - 1}
                    value={m.stampsAt}
                    onChange={(e) => update(i, { stampsAt: Number(e.target.value) })}
                    aria-label="Sellos para este premio"
                    className="h-9 w-16 rounded-lg border border-input bg-transparent px-2 text-sm tabular-nums"
                  />
                  sellos:
                </label>
                <Input
                  value={m.description}
                  maxLength={80}
                  placeholder="Ej. 10% de descuento"
                  onChange={(e) => update(i, { description: e.target.value })}
                  aria-label="Descripción del premio"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Quitar premio"
                  onClick={() => setRows((r) => r.filter((_, j) => j !== i))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              <Gift className="size-4 shrink-0" />
              <span>
                A los <strong className="text-foreground tabular-nums">{stampsRequired}</strong> sellos:{" "}
                <span className="text-foreground">{finalReward}</span> (premio final, se edita arriba)
              </span>
            </li>
          </ul>
          <div className="flex flex-wrap gap-2">
            {rows.length < MAX_MILESTONES ? (
              <Button type="button" variant="outline" onClick={add}>
                <Plus className="size-4" /> Agregar premio
              </Button>
            ) : null}
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Guardar premios"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
