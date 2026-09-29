import Link from "next/link";
import { LogOut } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { stopImpersonation } from "@/app/actions/impersonation";
import { NavLinks, type NavItem } from "./nav-links";

interface StaffShellProps {
  title: string;
  userName: string;
  nav: NavItem[];
  impersonatingName?: string | null;
  children: React.ReactNode;
}

export function StaffShell({ title, userName, nav, impersonatingName, children }: StaffShellProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      {impersonatingName ? (
        <div className="sticky top-0 z-50 flex items-center justify-center gap-3 bg-amber-400 px-4 py-2 text-sm font-medium text-amber-950">
          <span>
            Estás viendo como <strong>{impersonatingName}</strong>
          </span>
          <form action={stopImpersonation}>
            <button type="submit" className="rounded-md bg-amber-950/10 px-2 py-0.5 underline-offset-2 hover:underline">
              Salir
            </button>
          </form>
        </div>
      ) : null}
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/" className="text-lg font-bold tracking-tight">
            Sellos <span className="font-normal text-muted-foreground">· {title}</span>
          </Link>
          <NavLinks items={nav} />
          <div className="ml-auto flex items-center gap-3 text-sm text-muted-foreground">
            <span className="hidden sm:inline">{userName}</span>
            <form action={signOut}>
              <button type="submit" className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-muted hover:text-foreground" aria-label="Cerrar sesión">
                <LogOut className="size-4" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
