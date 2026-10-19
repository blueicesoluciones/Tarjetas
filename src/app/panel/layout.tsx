import { notFound } from "next/navigation";
import { setPanelBranch } from "@/app/actions/branch";
import { BranchSelect } from "@/components/staff/branch-select";
import { StaffShell } from "@/components/staff/staff-shell";
import { branchesForPlan, selectedPanelBranch } from "@/lib/branches";
import { getBusinessWithProgram } from "@/lib/auth/business";
import { requireStaff } from "@/lib/auth/staff";

const NAV = [
  { href: "/panel", label: "Resumen", exact: true },
  { href: "/panel/clientes", label: "Clientes" },
  { href: "/panel/programa", label: "Programa" },
  { href: "/panel/equipo", label: "Equipo" },
  { href: "/panel/actividad", label: "Actividad" },
  { href: "/panel/compartir", label: "Compartir" },
  { href: "/panel/campanas", label: "Campañas" },
  { href: "/panel/reporte", label: "Reporte" },
  { href: "/panel/plan", label: "Mi plan" },
  { href: "/escaner", label: "Escáner" },
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
      toolbar={
        branches.length > 0 ? (
          <>
            <BranchSelect
              action={setPanelBranch}
              branches={branches.map((b) => ({ id: b.id, name: b.name, isActive: b.is_active }))}
              selectedId={selected?.id ?? null}
              allLabel="Todas las sedes"
              label="Ver sede"
            />
            <span className="text-xs text-muted-foreground">
              {selected
                ? `Resumen, actividad, reporte y equipo de ${selected.name}. Clientes y programa son de todo el negocio.`
                : "Vista general de todas las sedes."}
            </span>
          </>
        ) : null
      }
    >
      {children}
    </StaffShell>
  );
}
