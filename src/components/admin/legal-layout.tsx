import Link from "next/link";

/** Diseño de lectura para las páginas legales. */
export function LegalLayout({ title, updated, children }: { title: string; updated?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-bold tracking-tight">
            Sellos
          </Link>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/privacidad" className="hover:text-foreground">
              Privacidad
            </Link>
            <Link href="/terminos" className="hover:text-foreground">
              Términos
            </Link>
            <Link href="/soporte" className="hover:text-foreground">
              Soporte
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <article className="max-w-prose space-y-4 text-[15px] leading-relaxed [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {updated ? <p className="text-sm text-muted-foreground">Última actualización: {updated}</p> : null}
          {children}
        </article>
      </main>
    </div>
  );
}
