import Link from "next/link";
import { LEGAL } from "@/lib/legal";
import { Check, Globe, ScanLine, ShieldCheck, Smartphone, Store, Wallet } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Marca pendiente de definir: "Sellos" es un nombre provisorio.
const CONTACT_MAILTO = `mailto:${LEGAL.email}?subject=Quiero%20tarjetas%20de%20sellos%20para%20mi%20negocio`;

const STEPS = [
  {
    icon: Store,
    title: "Tu negocio se inscribe",
    body: "Configuramos tu tarjeta con tu logo, tus colores, cuántos sellos se necesitan y cuál es el premio.",
  },
  {
    icon: Smartphone,
    title: "El cliente crea su tarjeta",
    body: "Escanea el QR del local y listo: nombre, teléfono y un PIN. Sin apps ni contraseñas.",
  },
  {
    icon: ScanLine,
    title: "El cajero suma sellos",
    body: "Desde su celular escanea la tarjeta y toca “+1 sello”. Al completarla, el cliente canjea su premio.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5">
        <span className="text-xl font-bold tracking-tight">Sellos</span>
        <Link href="/login" className={buttonVariants({ variant: "outline" })}>
          Ingresar
        </Link>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-12 md:grid-cols-2 md:py-20">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium">
              <Wallet className="size-3.5" /> Compatible con Google Wallet
            </p>
            <h1 className="text-4xl font-extrabold tracking-tight text-balance md:text-5xl">
              La tarjeta de sellos de tu negocio, ahora en el celular de tus clientes
            </h1>
            <p className="mt-4 max-w-lg text-lg text-muted-foreground">
              Olvídate del cartón que se pierde. Tus clientes juntan sellos con un QR y vuelven por su premio.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={CONTACT_MAILTO} className={cn(buttonVariants({ size: "lg" }), "h-11 px-5 text-base")}>
                Contáctanos
              </a>
              <Link href="/login" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "h-11 px-5 text-base")}>
                Ingresar
              </Link>
            </div>
          </div>

          <CardMockup />
        </section>

        <section className="border-y bg-muted/40">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-center text-2xl font-bold tracking-tight md:text-3xl">Cómo funciona</h2>
            <ol className="mt-10 grid gap-6 md:grid-cols-3">
              {STEPS.map((step, i) => (
                <li key={step.title} className="rounded-2xl bg-background p-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <step.icon className="size-5" />
                    </span>
                    <span className="text-sm font-semibold text-muted-foreground">Paso {i + 1}</span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-1 text-muted-foreground">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-6 px-4 py-16 md:grid-cols-3">
          <Feature icon={Wallet} title="Google Wallet">
            La tarjeta se guarda en el teléfono Android y se actualiza sola con cada sello.
          </Feature>
          <Feature icon={Globe} title="Tarjeta web siempre">
            Funciona en cualquier teléfono, también iPhone, desde un enlace personal.
          </Feature>
          <Feature icon={ShieldCheck} title="Segura">
            Solo tu personal suma sellos. Los datos de cada negocio están aislados.
          </Feature>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground">
          <span>
            © {new Date().getFullYear()} {LEGAL.company} · {LEGAL.country} ·{" "}
            <a href={`mailto:${LEGAL.email}`} className="hover:text-foreground">
              {LEGAL.email}
            </a>
          </span>
          <nav className="flex gap-4">
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
      </footer>
    </div>
  );
}

function Feature({ icon: Icon, title, children }: { icon: typeof Wallet; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border p-6">
      <Icon className="size-6" />
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

function CardMockup() {
  const filled = 7;
  return (
    <div className="mx-auto w-full max-w-sm rotate-2 rounded-3xl bg-[#3B2F2F] p-6 text-[#FFF8E7] shadow-2xl">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-full bg-[#FFF8E7] text-lg font-bold text-[#3B2F2F]">
          C
        </span>
        <div>
          <p className="text-sm opacity-80">Café Luna</p>
          <p className="font-bold">Tarjeta Café Luna</p>
        </div>
      </div>
      <p className="mt-5 text-xs tracking-wide uppercase opacity-70">Cliente</p>
      <p className="text-lg font-semibold">Camila Rojas</p>
      <div className="mt-5 grid grid-cols-5 gap-3" aria-label={`${filled} de 10 sellos`}>
        {Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            className={cn(
              "flex aspect-square items-center justify-center rounded-full border-2 border-[#FFF8E7]",
              i < filled ? "bg-[#FFF8E7] text-[#3B2F2F]" : "opacity-50",
            )}
          >
            {i < filled ? <Check className="size-4" strokeWidth={3} /> : null}
          </span>
        ))}
      </div>
      <p className="mt-5 text-sm opacity-80">Te faltan 3 para: un café gratis</p>
    </div>
  );
}
