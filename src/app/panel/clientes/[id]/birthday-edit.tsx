"use client";

import { useActionState, useState } from "react";
import { FormStatus } from "@/components/admin/form-status";
import { Button } from "@/components/ui/button";
import { MONTHS, formatBirthday } from "@/lib/domain/birthday";
import { updateBirthdayAction, type BirthdayEditState } from "./actions";

const selectClass = "h-8 rounded-md border bg-background px-2 text-sm";

/** Cumpleaños del cliente en el detalle: se ve y el dueño lo puede corregir. */
export function BirthdayEdit({ customerId, month, day }: { customerId: string; month: number | null; day: number | null }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<BirthdayEditState, FormData>(updateBirthdayAction.bind(null, customerId), {});

  if (!editing) {
    return (
      <div className="flex items-center justify-end gap-2">
        <span>{month && day ? formatBirthday(month, day) : <span className="text-muted-foreground">Sin registrar</span>}</span>
        <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditing(true)}>
          {month ? "Cambiar" : "Agregar"}
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-2 text-left">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <select name="birthMonth" defaultValue={month ?? ""} aria-label="Mes" required className={selectClass}>
          <option value="" disabled>
            Mes
          </option>
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <select name="birthDay" defaultValue={day ?? ""} aria-label="Día" required className={selectClass}>
          <option value="" disabled>
            Día
          </option>
          {Array.from({ length: 31 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
          Cerrar
        </Button>
      </div>
      <FormStatus error={state.error} success={state.success} />
    </form>
  );
}
