"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CreditCard,
  Gem,
  History,
  LayoutDashboard,
  Megaphone,
  QrCode,
  ScrollText,
  Store,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Íconos por nombre: los layouts son Server Components y no pueden pasar componentes. */
const ICONS = {
  home: LayoutDashboard,
  customers: Users,
  activity: History,
  card: CreditCard,
  share: QrCode,
  campaigns: Megaphone,
  report: BarChart3,
  team: UserCog,
  plan: Gem,
  businesses: Store,
  audit: ScrollText,
} satisfies Record<string, LucideIcon>;

export type NavIcon = keyof typeof ICONS;

export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
  exact?: boolean;
}

export interface NavGroup {
  /** Título del grupo; sin título para el primero (inicio). */
  label?: string;
  items: NavItem[];
}

export function NavLinks({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-5 text-sm" aria-label="Secciones">
      {groups.map((group, g) => (
        <div key={group.label ?? g}>
          {group.label ? (
            <p className="text-muted-foreground mb-1 px-3 text-xs font-medium">{group.label}</p>
          ) : null}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = ICONS[item.icon];
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                      active
                        ? "bg-ink text-paper font-medium"
                        : "text-foreground/75 hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
