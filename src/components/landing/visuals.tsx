import {
  Car,
  Coffee,
  Croissant,
  Hamburger,
  HeartHandshake,
  IceCreamCone,
  Megaphone,
  PawPrint,
  Scissors,
  Sparkles,
  Star,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MiniCardProps {
  name: string;
  icon: LucideIcon;
  bg: string;
  fg: string;
  filled: number;
  total?: number;
  className?: string;
}

/** Tarjeta de sellos en miniatura, con los colores de un negocio de ejemplo. */
export function MiniCard({ name, icon: Icon, bg, fg, filled, total = 6, className }: MiniCardProps) {
  return (
    <div className={cn("rounded-[20px] p-4", className)} style={{ background: bg, color: fg }}>
      <div className="flex items-center gap-2.5">
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-full"
          style={{ background: fg, color: bg }}
        >
          <Icon className="size-4" />
        </span>
        <p className="text-sm leading-tight font-semibold">{name}</p>
      </div>
      <div className="mt-4 flex gap-1.5" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className="size-3.5 rounded-full border-[1.5px]"
            style={{
              borderColor: fg,
              background: i < filled ? fg : "transparent",
              opacity: i < filled ? 1 : 0.45,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export const BUSINESS_CARDS: Omit<MiniCardProps, "className">[] = [
  { name: "Cafeterías", icon: Coffee, bg: "#3b2a20", fg: "#f3e3c7", filled: 4 },
  { name: "Panaderías", icon: Croissant, bg: "#e4572e", fg: "#fff4e8", filled: 2 },
  { name: "Heladerías", icon: IceCreamCone, bg: "#f6b9d0", fg: "#4a1631", filled: 5 },
  { name: "Restaurantes", icon: UtensilsCrossed, bg: "#0f5c4d", fg: "#e7f6c9", filled: 3 },
  { name: "Barberías", icon: Scissors, bg: "#1d3557", fg: "#f1faee", filled: 5 },
  { name: "Peluquerías", icon: Sparkles, bg: "#f2b705", fg: "#2b1d00", filled: 1 },
  { name: "Uñas y estética", icon: Star, bg: "#c8b6ff", fg: "#25124f", filled: 3 },
  { name: "Lavaderos de carros", icon: Car, bg: "#0d0d0d", fg: "#c7ff3d", filled: 4 },
  { name: "Tiendas de mascotas", icon: PawPrint, bg: "#ffd8a8", fg: "#5a2a00", filled: 2 },
  { name: "Comidas rápidas", icon: Hamburger, bg: "#b5179e", fg: "#ffe9f8", filled: 5 },
];

const LOCK_NOTICES = [
  {
    icon: Coffee,
    bg: "#3b2a20",
    fg: "#f3e3c7",
    who: "Café La Esquina",
    when: "ahora",
    body: "¡Te falta 1 sello para tu café gratis!",
  },
  {
    icon: Megaphone,
    bg: "#e4572e",
    fg: "#fff4e8",
    who: "Pan de la Abuela",
    when: "9:05",
    body: "Hoy 2x1 en pandebonos hasta las 11 a. m.",
  },
  {
    icon: HeartHandshake,
    bg: "#1d3557",
    fg: "#f1faee",
    who: "Barbería Don Bigote",
    when: "ayer",
    body: "¡Te extrañamos! Tu tarjeta te espera con 4 sellos.",
  },
];

/** Celular con la pantalla de bloqueo y los avisos que manda stamp. */
export function LockScreen({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative mx-auto aspect-[9/19] w-full max-w-[19rem] rounded-[3rem] bg-[#1a1a1a] p-2.5 shadow-[0_50px_100px_-30px_rgba(91,60,240,0.55)] ring-1 ring-white/10",
        className,
      )}
      aria-label="Avisos de stamp en la pantalla de bloqueo de un celular"
      role="img"
    >
      <div className="relative flex h-full flex-col overflow-hidden rounded-[2.4rem] bg-[radial-gradient(120%_80%_at_20%_0%,#7b61ff_0%,#5b3cf0_35%,#1b0f4d_75%,#0d0d0d_100%)] px-3.5 pt-3 text-white">
        <span aria-hidden className="mx-auto h-6 w-24 rounded-full bg-black" />
        <p className="mt-6 text-center text-sm font-medium text-white/80">jueves, 13 de noviembre</p>
        <p className="text-center text-7xl leading-none font-semibold tracking-tight">9:41</p>
        <ul className="mt-auto mb-6 space-y-2" aria-hidden>
          {LOCK_NOTICES.map((n) => (
            <li
              key={n.who}
              className="text-ink flex items-start gap-2.5 rounded-[18px] bg-white/85 p-2.5 backdrop-blur"
            >
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-[9px]"
                style={{ background: n.bg, color: n.fg }}
              >
                <n.icon className="size-4" />
              </span>
              <span className="min-w-0 text-[12px] leading-snug">
                <span className="flex justify-between gap-2 font-semibold">
                  <span className="truncate">{n.who}</span>
                  <span className="text-ink/50 shrink-0 font-normal">{n.when}</span>
                </span>
                <span className="text-ink/80 block">{n.body}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
