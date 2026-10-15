"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Botón para eliminar un cajero, con confirmación explícita. */
export function DeleteCashierButton({
  action,
  fieldName,
  profileId,
  name,
}: {
  action: (formData: FormData) => Promise<void>;
  fieldName: "profileId" | "userId";
  profileId: string;
  name: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        const ok = confirm(
          `¿Eliminar a «${name}» del equipo?\n\nYa no podrá ingresar y su usuario se borra para siempre. Los sellos que registró se conservan en el historial.\n\nSi solo quieres pausarlo, usa «Desactivar».`,
        );
        if (!ok) e.preventDefault();
      }}
    >
      <input type="hidden" name={fieldName} value={profileId} />
      <Button type="submit" size="sm" variant="ghost" className="text-destructive hover:text-destructive" aria-label={`Eliminar a ${name}`}>
        <Trash2 className="size-4" /> Eliminar
      </Button>
    </form>
  );
}
