"use client";

import { useActionState } from "react";
import { Cake } from "lucide-react";
import { BirthdayFields } from "@/components/customer/birthday-fields";
import { saveBirthday, type BirthdayState } from "./actions";

/** Pide el cumpleaños a quien se inscribió antes de que se preguntara. */
export function BirthdayForm({
  accessToken,
  businessName,
  buttonColor,
  buttonText,
}: {
  accessToken: string;
  businessName: string;
  buttonColor: string;
  buttonText: string;
}) {
  const [state, action, pending] = useActionState<BirthdayState, FormData>(saveBirthday.bind(null, accessToken), {});

  if (state.saved) {
    return (
      <p role="status" className="rounded-2xl bg-emerald-50 p-4 text-center text-sm text-emerald-900">
        ¡Listo! Guardamos tu cumpleaños. 🎂
      </p>
    );
  }

  return (
    <section id="cumpleanos" className="scroll-mt-4 rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 text-sm text-amber-950 shadow-sm">
      <p className="flex items-center gap-2 font-semibold">
        <Cake className="size-5" aria-hidden />
        Actualiza tu información
      </p>
      <p className="mt-1">Cuéntale a {businessName} cuándo cumples años. Solo el mes y el día.</p>
      <form action={action} className="mt-3 space-y-3 text-foreground">
        <BirthdayFields
          idPrefix="card-birth"
          monthProps={{ name: "birthMonth", required: true }}
          dayProps={{ name: "birthDay", required: true }}
          error={state.error}
        />
        <button
          type="submit"
          disabled={pending}
          className="h-11 w-full rounded-xl font-semibold transition-opacity disabled:opacity-60"
          style={{ backgroundColor: buttonColor, color: buttonText }}
        >
          {pending ? "Guardando…" : "Guardar mi cumpleaños"}
        </button>
      </form>
    </section>
  );
}
