import Link from "next/link";
import { cn } from "@/lib/utils";

/** Pestañas de una página (por parámetro de la URL, así se pueden compartir y recargar). */
export function SectionTabs({ tabs, active }: { tabs: { key: string; label: string; href: string }[]; active: string }) {
  return (
    <nav aria-label="Secciones de la página" className="-mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-1 rounded-xl bg-muted p-1 text-sm">
        {tabs.map((t) => (
          <li key={t.key}>
            <Link
              href={t.href}
              aria-current={t.key === active ? "page" : undefined}
              className={cn(
                "block rounded-lg px-3.5 py-1.5 whitespace-nowrap transition-colors",
                t.key === active ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
