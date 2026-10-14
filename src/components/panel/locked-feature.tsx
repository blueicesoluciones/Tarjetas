import { Lock } from "lucide-react";
import { PLANS, type Plan } from "@/lib/plans";
import { cn } from "@/lib/utils";

/** Función no incluida en el plan actual: muestra qué es y desde qué plan está disponible. */
export function LockedFeature({
  title,
  description,
  plan,
  className,
}: {
  title: string;
  description: string;
  plan: Plan;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start gap-4 rounded-xl border border-dashed bg-muted/40 p-5", className)}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sand/60">
        <Lock className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        <p className="mt-2 text-sm font-medium">Disponible en el plan {PLANS[plan].label}</p>
        <p className="text-xs text-muted-foreground">Pídelo a tu asesor de stamp</p>
      </div>
    </div>
  );
}
