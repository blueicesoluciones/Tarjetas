import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HelpCircle, LogOut, ScanLine, Search } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { stopImpersonation } from "@/app/actions/impersonation";
import { OfflineBanner } from "@/components/escaner/offline-banner";
import { RegisterServiceWorker } from "@/components/escaner/register-sw";
import { getBusinessWithProgram } from "@/lib/auth/business";
import { requireStaff } from "@/lib/auth/staff";

export const metadata: Metadata = {
  title: "Escáner",
  manifest: "/escaner/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Escáner", statusBarStyle: "black-translucent" },
  icons: { apple: "/escaner/icons/180" },
};

export const viewport: Viewport = { themeColor: "#111827", viewportFit: "cover" };

export default async function ScannerLayout({ children }: LayoutProps<"/escaner">) {
  const ctx = await requireStaff(["owner", "cashier"], { needsBusiness: true });
  const { business } = await getBusinessWithProgram(ctx.businessId!);
  if (!business) notFound();
  const canUsePanel = ctx.profile.role !== "cashier";

  return (
    <div className="flex min-h-dvh flex-col bg-neutral-950 text-white">
      <RegisterServiceWorker />
      {ctx.impersonating ? (
        <form action={stopImpersonation} className="bg-amber-400 px-4 py-1.5 text-center text-xs font-medium text-amber-950">
          Viendo como {business.name} · <button className="underline">Salir</button>
        </form>
      ) : null}
      <header className="flex items-center gap-3 px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold">{business.name}</p>
          <p className="truncate text-xs text-white/60">{ctx.profile.full_name}</p>
        </div>
        {canUsePanel ? (
          <Link href="/panel" className="rounded-lg bg-white/10 px-3 py-2 text-sm">
            Panel
          </Link>
        ) : null}
        <form action={signOut}>
          <button type="submit" aria-label="Cerrar sesión" className="rounded-lg bg-white/10 p-2">
            <LogOut className="size-5" />
          </button>
        </form>
      </header>
      <OfflineBanner />
      <main className="flex flex-1 flex-col px-4 pb-28">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-white/10 bg-neutral-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <NavItem href="/escaner" icon={<ScanLine className="size-6" />} label="Escanear" />
        <NavItem href="/escaner/buscar" icon={<Search className="size-6" />} label="Buscar" />
        <NavItem href="/escaner/ayuda" icon={<HelpCircle className="size-6" />} label="Ayuda" />
      </nav>
    </div>
  );
}

function NavItem({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="flex flex-col items-center gap-1 py-3 text-xs text-white/80 active:text-white">
      {icon}
      {label}
    </Link>
  );
}
