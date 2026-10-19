import type { ComponentProps } from "react";
import { MONTHS } from "@/lib/domain/birthday";
import { FieldError } from "./field-error";

const selectClass = "h-11 w-full rounded-lg border border-input bg-background px-3 text-base";

/** Mes y día de cumpleaños (sin año). Los selects reciben las props de react-hook-form o de un form normal. */
export function BirthdayFields({
  monthProps,
  dayProps,
  error,
  idPrefix = "birth",
}: {
  monthProps: ComponentProps<"select">;
  dayProps: ComponentProps<"select">;
  error?: string;
  idPrefix?: string;
}) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-sm font-medium">Tu cumpleaños</legend>
      <div className="grid grid-cols-[1.4fr_1fr] gap-3">
        <select id={`${idPrefix}-month`} aria-label="Mes de tu cumpleaños" defaultValue="" className={selectClass} {...monthProps}>
          <option value="" disabled>
            Mes
          </option>
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </option>
          ))}
        </select>
        <select id={`${idPrefix}-day`} aria-label="Día de tu cumpleaños" defaultValue="" className={selectClass} {...dayProps}>
          <option value="" disabled>
            Día
          </option>
          {Array.from({ length: 31 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </select>
      </div>
      {error ? <FieldError message={error} /> : <p className="text-xs text-muted-foreground">Solo el mes y el día, para saludarte ese día.</p>}
    </fieldset>
  );
}
