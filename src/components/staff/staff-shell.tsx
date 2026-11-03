import Link from "next/link";
import { LogOut, ScanLine } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { stopImpersonation } from "@/app/actions/impersonation";
import { StampLogo } from "@/components/brand/logo";
import { MobileNav } from "./mobile-nav";
import { NavLinks, type NavGroup } from "./nav-links";

interface StaffShellProps {
  title: string;
  /** Inicio de la sección (logo y título llevan aquí, no a la portada pública). */
  homeHref: string;
  userName: string;
  nav: NavGroup[];
  impersonatingName?: string | null;
  /** Controles bajo el nombre del negocio (ej. selector de sede). */
  toolbar?: React.ReactNode;
  /** Acceso destacado (ej. abrir el escáner). */
  primaryAction?: { href: string; label: string };
  children: React.ReactNode;
}

/**
 * Estructura del panel: menú lateral agrupado en computador y menú desplegable
 * en el celular. El contenido de ambos es el mismo.
 */
export function StaffShell({
  title,
  homeHref,
  userName,
  nav,
  impersonatingName,
  toolbar,
  primaryAction,
  children,
}: StaffShellProps) {
  const brand = (
    <Link href={homeHref} className="flex min-w-0 items-center gap-2.5" aria-label={`${title}, inicio`}>
      <StampLogo height={24} />
      <span className="border-border text-muted-foreground truncate border-l pl-2.5 text-sm">{title}</span>
    </Link>
  );

  const menu = (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-5 pb-4">{brand}</div>
      {toolbar ? <div className="px-5 pb-4">{toolbar}</div> : null}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        <NavLinks groups={nav} />
      </div>
      <div className="space-y-3 border-t px-5 py-4">
        {primaryAction ? (
          <Link
            href={primaryAction.href}
            className="bg-lime text-ink hover:bg-lime/85 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors"
          >
            <ScanLine className="size-4" aria-hidden />
            {primaryAction.label}
          </Link>
        ) : null}
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground truncate">{userName}</span>
          <form action={signOut}>
            <button
              type="submit"
              className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex items-center gap-1.5 rounded-md px-2 py-1"
            >
              <LogOut className="size-4" aria-hidden />
              Salir
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh">
      {impersonatingName ? (
        <div className="bg-lime text-ink sticky top-0 z-40 flex items-center justify-center gap-3 px-4 py-2 text-sm font-medium">
          <span>
            Estás viendo como <strong>{impersonatingName}</strong>
          </span>
          <form action={stopImpersonation}>
            <button
              type="submit"
              className="bg-ink/10 rounded-md px-2 py-0.5 underline-offset-2 hover:underline"
            >
              Salir
            </button>
          </form>
        </div>
      ) : null}
      <div className="lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="bg-background sticky top-0 hidden h-dvh border-r lg:block">{menu}</aside>
        <div className="min-w-0">
          <header className="bg-background/95 sticky top-0 z-30 flex items-center gap-2 border-b px-4 py-2 backdrop-blur lg:hidden">
            <MobileNav>{menu}</MobileNav>
            <div className="min-w-0 flex-1">{brand}</div>
            {primaryAction ? (
              <Link
                href={primaryAction.href}
                className="bg-lime text-ink inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold"
              >
                <ScanLine className="size-4" aria-hidden />
                <span className="sr-only sm:not-sr-only">{primaryAction.label}</span>
              </Link>
            ) : null}
          </header>
          <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
