import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3,
  BellRing,
  Cake,
  Check,
  HeartHandshake,
  LogIn,
  Megaphone,
  MessageCircle,
  ScanLine,
  ShieldCheck,
  Store,
  X,
} from "lucide-react";
import { StampLogo, StampMark } from "@/components/brand/logo";
import { Payback } from "@/components/landing/payback";
import { RubberStamp } from "@/components/landing/rubber-stamp";
import { StampDemo } from "@/components/landing/stamp-demo";
import { BUSINESS_CARDS, LockScreen, MiniCard } from "@/components/landing/visuals";
import { LEGAL } from "@/lib/legal";
import { formatCop, PLANS, type Plan } from "@/lib/plans";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: { absolute: "stamp: tarjetas de sellos digitales para que tus clientes vuelvan" },
  description:
    "La tarjeta de sellos de tu negocio en el celular de tus clientes: Google Wallet, Apple Wallet o web. Sin apps. Desde $50.000 al mes.",
};

/** Enlace para pedir stamp: WhatsApp de ventas si está configurado, si no, correo. */
function contactHref(plan?: Plan): string {
  const text = plan
    ? `Hola, quiero stamp para mi negocio con el plan ${PLANS[plan].label}.`
    : "Hola, quiero stamp para mi negocio.";
  if (LEGAL.salesWhatsapp) {
    return `https://wa.me/${LEGAL.salesWhatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
  }
  const subject = plan ? `Quiero stamp: plan ${PLANS[plan].label}` : "Quiero stamp para mi negocio";
  const body = `${text}\n\nNombre del negocio:\nCiudad:\nTeléfono de contacto:`;
  return `mailto:${LEGAL.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

const TRIAL_DAYS = 15;

/** WhatsApp (o correo) para pedir la prueba gratis. */
function trialHref(): string {
  const text = `Hola, quiero la prueba gratis de ${TRIAL_DAYS} días de stamp para mi negocio.`;
  if (LEGAL.salesWhatsapp) {
    return `https://wa.me/${LEGAL.salesWhatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
  }
  return `mailto:${LEGAL.email}?subject=${encodeURIComponent("Prueba gratis de stamp")}&body=${encodeURIComponent(text)}`;
}

const external = LEGAL.salesWhatsapp ? { target: "_blank", rel: "noopener noreferrer" } : {};

const h2 = "text-[2.1rem] leading-[1.05] font-bold tracking-[-0.035em] text-balance md:text-5xl";

const pill =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold transition-colors outline-none focus-visible:ring-4 focus-visible:ring-ink/25";

const CARDBOARD_VS_STAMP: [string, string][] = [
  ["Se pierde, se moja o se queda en otra billetera", "Vive en el celular, que nadie olvida en casa"],
  ["Cualquiera falsifica un sello con un esfero", "Solo tu equipo suma sellos, escaneando un QR"],
  [
    "No sabes quién es tu cliente ni cada cuánto viene",
    "Ves quién viene, cada cuánto y quiénes son los mejores",
  ],
  ["Si deja de venir, no tienes cómo llamarlo", "Le llega un aviso al celular para que vuelva"],
  ["Imprimir otra vez cada vez que se acaban", "Pagas una mensualidad fija y ya"],
];

const STEPS = [
  {
    icon: Store,
    title: "Te dejamos todo listo",
    body: "Nos envías tu logo, colores y premio. Nosotros creamos tu tarjeta, tus usuarios y tu afiche con QR.",
  },
  {
    icon: ScanLine,
    title: "Tu cliente escanea el QR",
    body: "Escribe su nombre y celular, y guarda la tarjeta en Google Wallet, Apple Wallet o la web. Toma menos de un minuto.",
  },
  {
    icon: Check,
    title: "Tu cajero suma sellos",
    body: "Desde su celular escanea la tarjeta y toca «+1 sello». La tarjeta del cliente se actualiza sola.",
  },
  {
    icon: HeartHandshake,
    title: "Tu cliente vuelve",
    body: "Recibe «¡Te falta 1 sello!» y «¡Premio disponible!» en su celular, y regresa por su premio.",
  },
];

const FEATURES: { icon: typeof BellRing; title: string; plan?: string; body: string }[] = [
  {
    icon: BellRing,
    title: "Avisos en la pantalla del celular",
    body: "Cuando le falta un sello o ya ganó su premio, el aviso le llega solo. Sin que tú hagas nada.",
  },
  {
    icon: Megaphone,
    title: "Campañas en un minuto",
    plan: "Medium y Pro",
    body: "«Hoy 2x1 en capuchinos»: escribe el mensaje y llega al celular de quienes guardaron tu tarjeta.",
  },
  {
    icon: HeartHandshake,
    title: "«Te extrañamos» automático",
    plan: "Pro",
    body: "Si un cliente lleva tiempo sin venir, stamp le recuerda que su tarjeta lo espera.",
  },
  {
    icon: Cake,
    title: "Cumpleaños de tus clientes",
    body: "Tu panel te avisa quién cumple años hoy para que lo saludes por WhatsApp.",
  },
  {
    icon: BarChart3,
    title: "Tu negocio en números",
    body: "Clientes nuevos, sellos de la semana, premios canjeados y tus clientes más fieles.",
  },
  {
    icon: ShieldCheck,
    title: "Sin trampas",
    body: "Solo tu equipo suma sellos, con tiempo mínimo entre uno y otro. Cada cliente protege su tarjeta con un PIN.",
  },
];

interface PlanCard {
  plan: Plan;
  pitch: string;
  intro?: string;
  items: string[];
  featured?: boolean;
}

const PLAN_CARDS: PlanCard[] = [
  {
    plan: "standard",
    pitch: "Para empezar a fidelizar desde hoy.",
    items: [
      "Tarjeta en Google Wallet, Apple Wallet y web",
      "Tu logo y tus colores",
      "QR y afiche listos para imprimir",
      "App del cajero para sumar y canjear",
      "Avisos automáticos de «falta 1 sello» y «premio disponible»",
      `Dueño + ${PLANS.standard.maxCashiers} cajeros`,
      "Panel con clientes y cumpleaños",
      "Soporte por correo",
    ],
  },
  {
    plan: "medium",
    pitch: "Para vender más con campañas y premios en el camino.",
    intro: "Todo lo de Standard, más:",
    featured: true,
    items: [
      `${PLANS.medium.campaignsPerMonth} campañas al mes al celular de tus clientes`,
      `Hasta ${PLANS.medium.maxMilestones} premios en el camino (ej. descuento a los 5 sellos y premio a los 10)`,
      "Sello personalizado: tu logo, una imagen o un ícono",
      "Tarjeta con imagen de fondo",
      `Hasta ${PLANS.medium.maxCashiers} cajeros`,
      "Métricas detalladas",
      "Exporta tus clientes a Excel",
    ],
  },
  {
    plan: "pro",
    pitch: "Para negocios con varias sedes o que quieren todo en automático.",
    intro: "Todo lo de Medium, más:",
    items: [
      "Campañas sin límite",
      "Premios en el camino sin límite",
      "«Te extrañamos» automático para recuperar clientes",
      "Varias sedes, con el logo de cada sede en sus sellos",
      "Cajeros ilimitados",
      "Gráficos, ranking de clientes y reporte mensual",
      "Soporte prioritario por WhatsApp",
    ],
  },
];

const FAQ = [
  {
    q: "¿Puedo probarlo antes de pagar?",
    a: `Sí. Escríbenos por WhatsApp y te damos ${TRIAL_DAYS} días gratis para que lo uses con tus clientes de verdad. Te dejamos la tarjeta lista para empezar.`,
  },
  {
    q: "¿Mis clientes tienen que descargar una app?",
    a: "No. Escanean el QR de tu local, escriben su nombre y celular, y listo. La tarjeta se guarda en Google Wallet (Android) o Apple Wallet (iPhone), que ya vienen en el celular, y además tienen siempre una tarjeta web.",
  },
  {
    q: "¿Qué necesito para empezar?",
    a: "Un celular con cámara para sumar sellos. Nada de lectores, impresoras ni equipos nuevos. Nosotros configuramos tu tarjeta y te entregamos los usuarios para ti y tu equipo.",
  },
  {
    q: "¿Cuánto tarda en estar funcionando?",
    a: "Con tu logo, tus colores y el premio que quieres dar, tu tarjeta queda lista para que los clientes se inscriban. No tienes que configurar nada técnico.",
  },
  {
    q: "¿Y si un cliente cambia de celular o pierde su tarjeta?",
    a: "Su tarjeta no se pierde: entra de nuevo con su celular y su PIN y la recupera con todos sus sellos. Si olvida el PIN, tú se lo restableces desde tu panel.",
  },
  {
    q: "¿Pueden hacer trampa con los sellos?",
    a: "No. Solo los usuarios de tu negocio pueden sumar sellos, y hay un tiempo mínimo entre un sello y otro. Cada sello queda registrado con quién lo puso y cuándo, y se puede deshacer si fue un error.",
  },
  {
    q: "¿Puedo cambiar de plan después?",
    a: "Sí. Puedes empezar con Standard y subir cuando quieras más herramientas. Tus clientes y sus sellos se quedan como están.",
  },
  {
    q: "¿Qué pasa con los datos de mis clientes?",
    a: "Son de tu negocio y nadie más los ve. Pedimos aceptar la política de privacidad y solo enviamos promociones a quienes lo autorizan, como exige la ley de protección de datos.",
  },
];

export default function Home() {
  return (
    <div className="bg-paper flex min-h-dvh flex-col overflow-x-clip">
      <header className="bg-paper/85 sticky top-0 z-40 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3.5">
          <Link href="/" aria-label="stamp, inicio" className="shrink-0">
            <StampLogo height={28} />
          </Link>
          <nav aria-label="Secciones" className="hidden items-center gap-7 text-sm font-medium md:flex">
            <a href="#como-funciona" className="hover:text-violet">
              Cómo funciona
            </a>
            <a href="#planes" className="hover:text-violet">
              Planes
            </a>
            <a href="#preguntas" className="hover:text-violet">
              Preguntas
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <a
              href="#planes"
              className={cn(
                pill,
                "bg-lime text-ink hover:bg-lime/80 hidden h-10 px-5 text-sm sm:inline-flex",
              )}
            >
              Ver planes
            </a>
            <Link href="/login" className={cn(pill, "bg-ink text-paper hover:bg-ink/85 h-10 px-5 text-sm")}>
              <LogIn className="size-4" /> Ingresar
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-14 px-4 pt-8 pb-16 md:grid-cols-[1.05fr_1fr] md:gap-12 md:pt-14 md:pb-24">
          <div>
            <h1 className="text-[3rem] leading-[0.95] font-bold tracking-[-0.045em] text-balance sm:text-7xl lg:text-[5.25rem]">
              Haz que tus clientes{" "}
              <span className="relative inline-block whitespace-nowrap">
                vuelvan.
                <svg
                  aria-hidden
                  viewBox="0 0 300 24"
                  preserveAspectRatio="none"
                  className="text-violet absolute -bottom-2 left-0 h-[0.28em] w-full"
                >
                  <path
                    d="M3 15 C 60 4, 120 22, 180 10 S 270 8, 297 13"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="7"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>
            <p className="text-ink/70 mt-8 max-w-lg text-lg leading-relaxed">
              Tu tarjeta de sellos, ahora en el celular de tus clientes: en Google Wallet, Apple Wallet o la
              web. Sin apps, sin cartón que se pierde y con avisos que los traen de regreso.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a
                href={contactHref()}
                {...external}
                className={cn(
                  pill,
                  "bg-ink text-paper hover:bg-ink/85 h-14 px-7 text-base shadow-[0_10px_0_-4px_#5b3cf0]",
                )}
              >
                <MessageCircle className="size-5" /> Quiero stamp en mi negocio
              </a>
              <a
                href="#planes"
                className={cn(pill, "ring-ink hover:bg-ink hover:text-paper h-14 px-7 text-base ring-2")}
              >
                Ver planes y precios
              </a>
            </div>
            <p className="mt-6 text-sm">
              ¿Quieres probar primero?{" "}
              <a
                href={trialHref()}
                {...external}
                className="decoration-violet hover:text-violet font-semibold underline decoration-[3px] underline-offset-4"
              >
                Pide {TRIAL_DAYS} días gratis por WhatsApp
              </a>
            </p>
            <ul className="text-ink/75 mt-9 grid gap-2.5 text-sm sm:grid-cols-2">
              {[
                `Desde ${formatCop(PLANS.standard.priceCop)} al mes`,
                "Funciona en Android y iPhone",
                "Tus clientes no descargan nada",
                "Nosotros te lo dejamos listo",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="bg-lime flex size-5 shrink-0 items-center justify-center rounded-full">
                    <Check className="size-3" strokeWidth={3.5} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Escenario del demo */}
          <div className="relative">
            <div className="bg-lime relative overflow-hidden rounded-[40px] px-5 pt-6 pb-7 sm:px-10">
              <svg aria-hidden className="text-ink/[0.07] absolute inset-0 size-full">
                <defs>
                  <pattern id="hero-dots" width="22" height="22" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="2" fill="currentColor" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#hero-dots)" />
              </svg>
              <MiniCard
                {...BUSINESS_CARDS[4]}
                className="absolute top-28 -left-10 hidden w-56 -rotate-[14deg] shadow-xl sm:block"
              />
              <MiniCard
                {...BUSINESS_CARDS[1]}
                className="absolute -right-12 bottom-36 hidden w-56 rotate-[11deg] shadow-xl sm:block"
              />
              <div className="relative">
                <StampDemo />
              </div>
            </div>
            <RubberStamp
              id="hero-stamp"
              ring="PRUEBA GRATIS · PRUEBA GRATIS · "
              center={String(TRIAL_DAYS)}
              sub="DÍAS"
              size={132}
              className="text-violet absolute -top-12 -right-3 z-10 [--stamp-rot:12deg] motion-safe:animate-[stamp-slam_650ms_cubic-bezier(.2,.8,.3,1)_500ms_both] sm:-right-8 sm:size-40"
            />
          </div>
        </section>

        {/* Para quién */}
        <section aria-labelledby="para-quien" className="pb-20 md:pb-24">
          <div className="mx-auto max-w-6xl px-4">
            <h2 id="para-quien" className="text-lg font-semibold">
              Hecho para negocios a los que la gente vuelve
            </h2>
          </div>
          <ul className="mx-auto mt-5 flex max-w-6xl snap-x scroll-px-4 [scrollbar-width:none] gap-3 overflow-x-auto px-4 pb-2 md:grid md:grid-cols-5 md:overflow-visible">
            {BUSINESS_CARDS.map((b, i) => (
              <li
                key={b.name}
                className={cn(
                  "w-44 shrink-0 snap-start md:w-auto",
                  i % 2 ? "md:rotate-[1.2deg]" : "md:-rotate-[1.2deg]",
                )}
              >
                <MiniCard {...b} />
              </li>
            ))}
          </ul>
        </section>

        {/* Por qué */}
        <section className="bg-white">
          <div className="mx-auto max-w-6xl px-4 py-20 md:py-28">
            <div className="grid gap-12 md:grid-cols-[1fr_1.15fr] md:gap-16">
              <div>
                <h2 className={h2}>Un cliente que vuelve vale más que uno nuevo.</h2>
                <p className="text-ink/70 mt-5 max-w-md text-lg leading-relaxed">
                  Conseguir un cliente nuevo cuesta varias veces más que hacer que regrese uno que ya te
                  conoce. La tarjeta de sellos es la forma más simple de darle una razón para volver.
                </p>
                <dl className="mt-10 grid gap-4 sm:grid-cols-2">
                  <div className="bg-violet rounded-[28px] p-6 text-white">
                    <dt className="text-sm text-white/75">Más clientes que regresan, más utilidad</dt>
                    <dd className="mt-3 text-[2.6rem] leading-none font-bold tracking-tight">25–95%</dd>
                    <dd className="mt-3 text-sm leading-relaxed text-white/75">
                      más utilidades al subir 5% la retención de clientes, según Bain &amp; Company.
                    </dd>
                  </div>
                  <div className="bg-lime rounded-[28px] p-6">
                    <dt className="text-ink/70 text-sm">Ver su avance los motiva</dt>
                    <dd className="mt-3 text-[2.6rem] leading-none font-bold tracking-tight">
                      34% <span className="text-ink/45 text-2xl">vs 19%</span>
                    </dd>
                    <dd className="text-ink/70 mt-3 text-sm leading-relaxed">
                      completaron la tarjeta cuando ya traía avance, frente a una vacía (Journal of Consumer
                      Research).
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="bg-paper ring-ink/10 self-center overflow-hidden rounded-[28px] ring-1">
                <div className="grid grid-cols-2 text-sm font-semibold">
                  <p className="bg-[#d8c3a5] p-4 text-[#5a4630] sm:p-5">Tarjeta de cartón</p>
                  <p className="bg-ink text-paper flex items-center gap-2 p-4 sm:p-5">
                    <StampMark size={18} tone="white" /> stamp
                  </p>
                </div>
                <ul>
                  {CARDBOARD_VS_STAMP.map(([before, after]) => (
                    <li key={after} className="border-ink/10 grid grid-cols-2 border-t text-sm leading-snug">
                      <p className="flex gap-2 bg-[#efe4d3] p-4 text-[#7a6650] sm:p-5">
                        <X className="mt-0.5 size-4 shrink-0" />{" "}
                        <span className="line-through decoration-[#7a6650]/40">{before}</span>
                      </p>
                      <p className="flex gap-2 p-4 font-medium sm:p-5">
                        <span className="bg-lime mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full">
                          <Check className="size-2.5" strokeWidth={4} />
                        </span>
                        {after}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Cómo funciona */}
        <section id="como-funciona" className="scroll-mt-16">
          <div className="mx-auto max-w-6xl px-4 py-20 md:py-28">
            <h2 className={cn(h2, "max-w-xl")}>Empiezas sin aprender nada nuevo.</h2>
            <ol className="relative mt-14 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
              <span
                aria-hidden
                className="border-violet/40 absolute top-12 right-[12%] left-[12%] hidden border-t-2 border-dashed lg:block"
              />
              {STEPS.map((step, i) => (
                <li key={step.title} className="relative">
                  <div className="flex items-end gap-3">
                    <RubberStamp
                      id={`step-${i}`}
                      ring="STAMP · STAMP · STAMP · STAMP · "
                      center={String(i + 1)}
                      size={96}
                      className={cn("bg-paper text-violet", i % 2 ? "rotate-[8deg]" : "-rotate-[10deg]")}
                    />
                    <step.icon className="text-ink/40 mb-2 size-6" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold">{step.title}</h3>
                  <p className="text-ink/70 mt-2 leading-relaxed">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Lo que hace por ti */}
        <section className="bg-ink text-paper relative overflow-hidden">
          <div
            aria-hidden
            className="bg-violet/35 absolute -top-40 -left-40 size-[36rem] rounded-full blur-[120px]"
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 py-20 md:py-28 lg:grid-cols-[20rem_1fr] lg:gap-20">
            <LockScreen className="order-2 lg:order-1" />
            <div className="order-1 lg:order-2">
              <h2 className={cn(h2, "max-w-2xl")}>Trabaja por ti incluso cuando el local está cerrado.</h2>
              <ul className="mt-12 grid gap-x-10 gap-y-9 sm:grid-cols-2">
                {FEATURES.map((f) => (
                  <li key={f.title} className="flex gap-4">
                    <span className="bg-lime text-ink flex size-11 shrink-0 items-center justify-center rounded-2xl">
                      <f.icon className="size-5" strokeWidth={2} />
                    </span>
                    <div>
                      <h3 className="font-semibold">
                        {f.title}
                        {f.plan ? (
                          <span className="bg-violet mt-1.5 block w-fit rounded-full px-2.5 py-0.5 text-[11px] font-medium">
                            {f.plan}
                          </span>
                        ) : null}
                      </h3>
                      <p className="text-paper/65 mt-1.5 text-sm leading-relaxed">{f.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Se paga solo */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 md:grid-cols-[1fr_1.1fr] md:gap-16 md:py-28">
          <div>
            <h2 className={h2}>Se paga con unos pocos clientes que vuelvan.</h2>
            <p className="text-ink/70 mt-5 max-w-md text-lg leading-relaxed">
              Elige cuánto gasta en promedio un cliente en tu negocio y mira cuántas compras extra al mes
              necesitas para cubrir stamp.
            </p>
          </div>
          <Payback />
        </section>

        {/* Planes */}
        <section id="planes" className="scroll-mt-16 bg-[#ece9ff]">
          <div className="mx-auto max-w-6xl px-4 py-20 md:py-28">
            <div className="max-w-2xl">
              <h2 className={h2}>Un plan para cada etapa de tu negocio.</h2>
              <p className="text-ink/70 mt-4 text-lg">
                Precio fijo al mes, en pesos colombianos. Empieza con el que necesitas y sube cuando quieras.
                Y si quieres probar antes, tienes {TRIAL_DAYS} días gratis.
              </p>
            </div>

            <div className="mt-14 grid items-start gap-5 lg:grid-cols-3">
              {PLAN_CARDS.map((card) => {
                const plan = PLANS[card.plan];
                return (
                  <article
                    key={card.plan}
                    className={cn(
                      "relative flex h-full flex-col rounded-[32px] p-7",
                      card.featured
                        ? "bg-violet text-white shadow-[0_40px_80px_-30px_rgba(91,60,240,0.8)] lg:-mt-6 lg:pb-12"
                        : "ring-ink/10 bg-white ring-1",
                    )}
                  >
                    {card.featured ? (
                      <RubberStamp
                        id="plan-stamp"
                        ring="RECOMENDADO · RECOMENDADO · "
                        center="★"
                        size={92}
                        className="text-lime absolute top-3 right-3 rotate-[14deg]"
                      />
                    ) : null}
                    <h3 className="text-xl font-semibold">{plan.label}</h3>
                    <p
                      className={cn(
                        "mt-2 min-h-12 pr-24 text-sm",
                        card.featured ? "text-white/75" : "text-ink/65",
                      )}
                    >
                      {card.pitch}
                    </p>
                    <p className="mt-6 flex items-baseline gap-1.5">
                      <span className="text-5xl font-bold tracking-tight tabular-nums">
                        {formatCop(plan.priceCop)}
                      </span>
                      <span className={card.featured ? "text-white/70" : "text-ink/60"}>/mes</span>
                    </p>
                    <a
                      href={contactHref(card.plan)}
                      {...external}
                      className={cn(
                        pill,
                        "mt-7 w-full",
                        card.featured
                          ? "bg-lime text-ink hover:bg-lime/85"
                          : "bg-ink text-paper hover:bg-ink/85",
                      )}
                    >
                      Empezar con {plan.label}
                    </a>
                    <p className={cn("mt-7 text-sm font-semibold", card.featured && "text-lime")}>
                      {card.intro ?? "Incluye:"}
                    </p>
                    <ul className="mt-3 space-y-2.5 text-sm">
                      {card.items.map((item) => (
                        <li key={item} className="flex gap-2.5 leading-snug">
                          <span
                            className={cn(
                              "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full",
                              card.featured ? "bg-lime text-ink" : "bg-ink text-paper",
                            )}
                          >
                            <Check className="size-2.5" strokeWidth={4} />
                          </span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>

            <div className="bg-ink text-paper mt-8 flex flex-col items-start justify-between gap-5 rounded-[32px] p-7 sm:flex-row sm:items-center sm:p-8">
              <div>
                <p className="text-2xl font-semibold">
                  Pruébalo <span className="text-lime">{TRIAL_DAYS} días gratis.</span>
                </p>
                <p className="text-paper/70 mt-1">
                  Escríbenos por WhatsApp, te dejamos tu tarjeta funcionando y la usas con tus clientes antes
                  de pagar.
                </p>
              </div>
              <a
                href={trialHref()}
                {...external}
                className={cn(pill, "bg-lime text-ink hover:bg-lime/85 shrink-0")}
              >
                <MessageCircle className="size-4" /> Pedir mi prueba gratis
              </a>
            </div>
          </div>
        </section>

        {/* Preguntas */}
        <section id="preguntas" className="mx-auto max-w-3xl scroll-mt-16 px-4 py-20 md:py-28">
          <h2 className={h2}>Preguntas frecuentes</h2>
          <div className="mt-10 space-y-3">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group ring-ink/10 open:ring-violet rounded-3xl bg-white px-6 py-5 ring-1 open:ring-2"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-medium outline-none focus-visible:underline [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span
                    aria-hidden
                    className="bg-lime group-open:bg-violet flex size-8 shrink-0 items-center justify-center rounded-full text-lg transition-transform group-open:rotate-45 group-open:text-white"
                  >
                    +
                  </span>
                </summary>
                <p className="text-ink/70 mt-3 max-w-2xl leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Cierre */}
        <section className="bg-lime relative overflow-hidden">
          <svg aria-hidden className="text-ink/[0.07] absolute inset-0 size-full">
            <rect width="100%" height="100%" fill="url(#hero-dots)" />
          </svg>
          <div className="relative mx-auto flex max-w-6xl flex-col items-start justify-between gap-10 px-4 py-16 md:flex-row md:items-center md:py-24">
            <div>
              <h2 className={cn(h2, "text-ink max-w-xl")}>
                Tu próximo cliente fiel ya está pagando en tu caja.
              </h2>
              <p className="text-ink/75 mt-4 max-w-lg text-lg">
                Dale hoy una razón para volver. Escríbenos por WhatsApp, te dejamos tu tarjeta lista y la
                pruebas {TRIAL_DAYS} días gratis.
              </p>
              <a
                href={trialHref()}
                {...external}
                className={cn(
                  pill,
                  "bg-ink text-paper hover:bg-ink/85 mt-8 h-14 px-8 text-base shadow-[0_10px_0_-4px_#5b3cf0]",
                )}
              >
                <MessageCircle className="size-5" /> Empezar mi prueba gratis
              </a>
            </div>
            <RubberStamp
              id="close-stamp"
              ring="PRUEBA GRATIS · PRUEBA GRATIS · "
              center={String(TRIAL_DAYS)}
              sub="DÍAS"
              size={220}
              className="text-violet shrink-0 -rotate-[10deg] self-center"
            />
          </div>
        </section>
      </main>

      <footer className="bg-ink text-paper/70">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <StampLogo height={22} tone="white" />
            <span>
              © {new Date().getFullYear()} {LEGAL.company}, {LEGAL.country}.{" "}
              <a href={`mailto:${LEGAL.email}`} className="hover:text-paper">
                {LEGAL.email}
              </a>
            </span>
          </div>
          <nav aria-label="Legal" className="flex gap-5">
            <Link href="/login" className="hover:text-paper">
              Ingresar
            </Link>
            <Link href="/privacidad" className="hover:text-paper">
              Privacidad
            </Link>
            <Link href="/terminos" className="hover:text-paper">
              Términos
            </Link>
            <Link href="/soporte" className="hover:text-paper">
              Soporte
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
