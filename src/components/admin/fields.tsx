import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FieldProps extends React.ComponentProps<"input"> {
  label: string;
  name: string;
  hint?: string;
}

export function Field({ label, name, hint, className, ...props }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} {...props} />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

interface SelectFieldProps extends React.ComponentProps<"select"> {
  label: string;
  name: string;
  options: { value: string; label: string }[];
}

export const nativeSelectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function SelectField({ label, name, options, className, ...props }: SelectFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={name}>{label}</Label>
      <select id={name} name={name} className={nativeSelectClass} {...props}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export const STATUS_LABELS = { trial: "Prueba", active: "Activo", suspended: "Suspendido" } as const;

export const COUNTRY_OPTIONS = [
  { value: "CL", label: "Chile" },
  { value: "CO", label: "Colombia" },
  { value: "MX", label: "México" },
  { value: "PE", label: "Perú" },
  { value: "AR", label: "Argentina" },
  { value: "EC", label: "Ecuador" },
  { value: "UY", label: "Uruguay" },
  { value: "ES", label: "España" },
  { value: "US", label: "Estados Unidos" },
];

export const TIMEZONE_OPTIONS = [
  "America/Santiago",
  "America/Bogota",
  "America/Mexico_City",
  "America/Lima",
  "America/Argentina/Buenos_Aires",
  "America/Guayaquil",
  "America/Montevideo",
  "Europe/Madrid",
  "America/New_York",
].map((tz) => ({ value: tz, label: tz }));
