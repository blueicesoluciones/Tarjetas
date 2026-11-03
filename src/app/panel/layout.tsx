import { notFound } from "next/navigation";
import { setPanelBranch } from "@/app/actions/branch";
import { BranchSelect } from "@/components/staff/branch-select";
import type { NavGroup } from "@/components/staff/nav-links";
import { StaffShell } from "@/components/staff/staff-shell";
import { branchesForPlan, selectedPanelBranch } from "@/lib/branches";
import { getBusinessWithProgram } from "@/lib/auth/business";
import { requireStaff } from "@/lib/auth/staff";

const NAV: NavGroup[] = [
  { items: [{ href: "/panel", label: "Resumen", icon: "home", exact: true }] },
  {
    label: "Clientes",
    items: [
      { href: "/panel/clientes", label: "Clientes", icon: "customers" },
      { href: "/panel/actividad", label: "Actividad", icon: "activity" },
    ],
  },
  {
    label: "Tu tarjeta",
    items: [
      { href: "/panel/programa", label: "Programa", icon: "card" },
      { href: "/panel/compartir", label: "Compartir", icon: "share" },
      { href: "/panel/campanas", label: "Campañas", icon: "campaigns" },
    ],
  },
  {
    label: "Tu negocio",
    items: [
      { href: "/panel/reporte", label: "Reporte", icon: "report" },
      { href: "/panel/equipo", label: "Equipo", icon: "team" },
      { href: "/panel/plan", label: "Mi plan", icon: "plan" },
    ],
  },
];

export default async function PanelLayout({ children }: LayoutProps<"/panel">) {
  const ctx = await requireStaff(["owner"], { needsBusiness: true });
  const { business } = await getBusinessWithProgram(ctx.businessId!);
  if (!business) notFound();
  const branches = await branchesForPlan(business.id, business.plan);
  const selected = await selectedPanelBranch(branches);

  return (
    <StaffShell
      homeHref="/panel"
      title={business.name}
      userName={ctx.profile.full_name}
      nav={NAV}
      impersonatingName={ctx.impersonating ? business.name : null}
      primaryAction={{ href: "/escaner", label: "Abrir escáner" }}
      toolbar={
        branches.length > 0 ? (
          <div className="space-y-1.5">
            <BranchSelect
              action={setPanelBranch}
              branches={branches.map((b) => ({ id: b.id, name: b.name, isActive: b.is_active }))}
              selectedId={selected?.id ?? null}
              allLabel="Todas las sedes"
              label="Ver sede"
              selectClassName="h-9 w-full min-w-0 rounded-lg border border-input bg-background px-2 text-sm"
            />
            {selected ? (
              <p className="text-xs leading-snug text-muted-foreground">
                Resumen, actividad, reporte y equipo muestran solo {selected.name}. Clientes y programa son de todo el negocio.
              </p>
            ) : null}
          </div>
        ) : null
      }
    >
      {children}
    </StaffShell>
  );
}
