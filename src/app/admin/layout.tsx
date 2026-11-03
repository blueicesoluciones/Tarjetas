import type { NavGroup } from "@/components/staff/nav-links";
import { StaffShell } from "@/components/staff/staff-shell";
import { requireStaff } from "@/lib/auth/staff";

const NAV: NavGroup[] = [
  {
    items: [
      { href: "/admin", label: "Resumen", icon: "home", exact: true },
      { href: "/admin/negocios", label: "Negocios", icon: "businesses" },
      { href: "/admin/auditoria", label: "Auditoría", icon: "audit" },
    ],
  },
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const ctx = await requireStaff(["super_admin"]);
  if (ctx.profile.role !== "super_admin") return null;
  return (
    <StaffShell homeHref="/admin" title="Administración" userName={ctx.profile.full_name} nav={NAV}>
      {children}
    </StaffShell>
  );
}
