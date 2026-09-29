import { StaffShell } from "@/components/staff/staff-shell";
import { requireStaff } from "@/lib/auth/staff";

const NAV = [
  { href: "/admin", label: "Resumen", exact: true },
  { href: "/admin/negocios", label: "Negocios" },
  { href: "/admin/auditoria", label: "Auditoría" },
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const ctx = await requireStaff(["super_admin"]);
  if (ctx.profile.role !== "super_admin") return null;
  return (
    <StaffShell title="Administración" userName={ctx.profile.full_name} nav={NAV}>
      {children}
    </StaffShell>
  );
}
