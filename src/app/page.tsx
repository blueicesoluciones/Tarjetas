import Link from "next/link";
import { ArrowRight, BarChart3, Check, Gift, LayoutGrid, ScanLine, ShieldCheck, Smartphone, Star, Users, Wallet } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { StampLogo, StampLogoStacked, StampMark } from "@/components/brand/logo";
import { LEGAL } from "@/lib/legal";
import { cn } from "@/lib/utils";

const CONTACT_MAILTO = `mailto:${LEGAL.email}?subject=Quiero%20stamp%20para%20mi%20negocio`;

const pill =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold transition-colors";

const STEPS = [
  { icon: ScanLine, title: "Escanea", body: "El cliente escanea el QR de tu local y crea su tarjeta en segundos." },
  { icon: Star, title: "Suma", body: "En cada visita tu cajero escanea su tarjeta y suma un sello." },
  { icon: Gift, title: "Gana", body: "Al completar los sellos, canjea su recompensa y vuelve por más." },
];

const HIGHLIGHTS = [
  { icon: LayoutGrid, title: "Fácil de usar", body: "para tus clientes" },
  { icon: BarChart3, title: "Aumenta", body: "la frecuencia de compra" },
  { icon: Users, title: "Todo desde", body: "un solo lugar" },
];

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="sticky top-0 z-40 border-b border-transparent bg-paper/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-4 py-4">
          <Link href="/" aria-label="stamp, inicio">
            <StampLogo height={30} />
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
            <a href="#como-funciona" className="hover:text-sage">
              Cómo funciona
            </a>
            <a href="#beneficios" className="hover:text-sage">
              Beneficios
            </a>
            <a href={CONTACT_MAILTO} className="hover:text-sage">
              Contáctanos
            </a>
          </nav>
          <Link href="/login" className={cn(pill, "h-10 bg-ink px-5 text-sm text-paper hover:bg-ink/85")}>
            Ingresar
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 bg-gradient-to-l from-sand/70 to-transparent md:block"
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-10 pb-16 md:grid-cols-[1.05fr_1fr] md:pt-16 md:pb-24">
            <div>
              <h1 className="text-[2.6rem] leading-[1.02] font-semibold tracking-[-0.03em] text-balance md:text-6xl">
                Fideliza clientes de <span className="text-sage">forma simple.</span>
              </h1>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
                Tarjetas de fidelidad digitales con QR. Sin apps, sin complicaciones y con resultados reales para tu
                negocio.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <a href={CONTACT_MAILTO} className={cn(pill, "bg-ink text-paper hover:bg-ink/85")}>
                  Comenzar ahora <ArrowRight className="size-4" />
                </a>
                <a href="#como-funciona" className={cn(pill, "border border-ink/15 hover:bg-ink/5")}>
                  Cómo funciona
                </a>
              </div>
              <p className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Wallet className="size-4" /> Compatible con Google Wallet
              </p>
            </div>

            <HeroVisual />
          </div>

          <div className="relative mx-auto max-w-6xl px-4 pb-14">
            <ul className="grid gap-6 border-t border-ink/10 pt-8 sm:grid-cols-3">
              {HIGHLIGHTS.map((h) => (
                <li key={h.title} className="flex items-center gap-4">
                  <h.icon className="size-7 shrink-0" strokeWidth={1.75} />
                  <p className="text-sm leading-snug">
                    <span className="font-semibold">{h.title}</span>
                    <br />
                    <span className="text-muted-foreground">{h.body}</span>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Cómo funciona */}
        <section id="como-funciona" className="scroll-mt-20 bg-[#efece6]">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <p className="text-xs font-semibold tracking-[0.2em] text-sage uppercase">Cómo funciona</p>
            <h2 className="mt-2 max-w-xl text-3xl font-semibold tracking-tight md:text-4xl">
              Recompensa las buenas visitas.
            </h2>
            <ol className="mt-10 grid gap-5 md:grid-cols-3">
              {STEPS.map((step) => (
                <li key={step.title} className="rounded-3xl bg-paper p-7">
                  <step.icon className="size-8" strokeWidth={1.75} />
                  <h3 className="mt-6 text-xl font-semibold">{step.title}</h3>
                  <p className="mt-2 text-muted-foreground">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Beneficios */}
        <section id="beneficios" className="scroll-mt-20 bg-ink text-paper">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 md:grid-cols-[1fr_1.2fr] md:items-center">
            <div>
              <StampMark size={64} tone="white" />
              <h2 className="mt-6 text-3xl font-semibold tracking-tight md:text-4xl">
                Tu tarjeta de sellos, en el celular de tus clientes.
              </h2>
              <p className="mt-4 text-paper/70">
                Olvídate del cartón que se pierde. Tus clientes juntan sellos con un QR y vuelven por su premio.
              </p>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2">
              <Benefit icon={Wallet} title="Google Wallet">
                La tarjeta se guarda en Android y se actualiza sola con cada sello.
              </Benefit>
              <Benefit icon={Smartphone} title="Funciona en cualquier celular">
                Tarjeta web personal, también en iPhone. Sin descargar nada.
              </Benefit>
              <Benefit icon={ShieldCheck} title="Segura">
                Solo tu equipo suma sellos. Los datos de cada negocio están aislados.
              </Benefit>
              <Benefit icon={BarChart3} title="Tu panel">
                Clientes, sellos, canjes y tu propio diseño de tarjeta.
              </Benefit>
            </ul>
          </div>
        </section>

        {/* Cierre */}
        <section className="bg-lime">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-14 md:flex-row md:items-center">
            <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-ink">
              Crea tu programa de fidelidad y empieza a ver más clientes regresar.
            </h2>
            <a href={CONTACT_MAILTO} className={cn(pill, "bg-ink text-paper hover:bg-ink/85")}>
              Crear mi programa <ArrowRight className="size-4" />
            </a>
          </div>
        </section>
      </main>

      <footer className="bg-paper">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <StampLogo height={22} />
            <span>
              © {new Date().getFullYear()} {LEGAL.company} · {LEGAL.country} ·{" "}
              <a href={`mailto:${LEGAL.email}`} className="hover:text-foreground">
                {LEGAL.email}
              </a>
            </span>
          </div>
          <nav className="flex gap-5">
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

function Benefit({ icon: Icon, title, children }: { icon: typeof Wallet; title: string; children: React.ReactNode }) {
  return (
    <li className="rounded-3xl border border-paper/10 bg-paper/5 p-6">
      <Icon className="size-6 text-lime" strokeWidth={1.75} />
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-paper/65">{children}</p>
    </li>
  );
}

/** Tarjeta de mesa con el QR del local y un celular con la visita registrada. */
function HeroVisual() {
  return (
    <div className="relative mx-auto h-[460px] w-full max-w-md md:h-[520px]">
      <div className="absolute top-2 left-0 w-[64%] -rotate-3 rounded-[28px] bg-white p-6 text-center shadow-[0_30px_60px_-20px_rgba(13,13,13,0.35)] md:p-7">
        <StampLogoStacked width={92} className="mx-auto" />
        <div className="mx-auto mt-4 w-fit rounded-xl bg-white p-1">
          <QRCodeSVG value="https://tarjetas-neon.vercel.app" size={140} level="M" marginSize={0} fgColor="#0D0D0D" />
        </div>
        <p className="mt-4 text-[11px] leading-tight font-semibold tracking-[0.18em] uppercase">
          Escanea y suma
          <br />
          tus visitas
        </p>
      </div>

      <div className="absolute right-0 bottom-0 w-[46%] rotate-2 rounded-[38px] bg-ink p-2 shadow-[0_30px_60px_-20px_rgba(13,13,13,0.45)]">
        <div className="flex aspect-[9/18] flex-col items-center rounded-[31px] bg-paper px-4 pt-3 pb-6 text-center">
          <span aria-hidden className="h-1.5 w-14 rounded-full bg-ink/90" />
          <StampLogo height={18} className="mt-5" />
          <div className="mt-auto flex size-16 items-center justify-center rounded-full bg-lime">
            <Check className="size-8" strokeWidth={3} />
          </div>
          <p className="mt-4 font-semibold">¡Visita registrada!</p>
          <p className="text-sm text-muted-foreground">3/8 visitas</p>
          <div className="mt-4 mb-auto flex justify-center gap-1.5" aria-hidden>
            {Array.from({ length: 8 }, (_, i) => (
              <span key={i} className={cn("size-2.5 rounded-full", i < 3 ? "bg-ink" : "bg-sand")} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
