import { notFound } from "next/navigation";
import { StaffShell } from "@/components/staff/staff-shell";
import { getBusinessWithProgram } from "@/lib/auth/business";
import { requireStaff } from "@/lib/auth/staff";

const NAV = [
  { href: "/panel", label: "Resumen", exact: true },
  { href: "/panel/clientes", label: "Clientes" },
  { href: "/panel/programa", label: "Programa" },
  { href: "/panel/equipo", label: "Equipo" },
  { href: "/panel/actividad", label: "Actividad" },
  { href: "/panel/compartir", label: "Compartir" },
  { href: "/escaner", label: "Escáner" },
];

export default async function PanelLayout({ children }: LayoutProps<"/panel">) {
  const ctx = await requireStaff(["owner"], { needsBusiness: true });
  const { business } = await getBusinessWithProgram(ctx.businessId!);
  if (!business) notFound();

  return (
    <StaffShell
      homeHref="/panel"
      title={business.name}
      userName={ctx.profile.full_name}
      nav={NAV}
      impersonatingName={ctx.impersonating ? business.name : null}
    >
      {children}
    </StaffShell>
  );
}
