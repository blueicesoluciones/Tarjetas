import Link from "next/link";
import { cn } from "@/lib/utils";

type Tone = "black" | "white";

// Proporciones de los SVG vectorizados del logo (public/brand).
const MARK_RATIO = 1744 / 1776;
const WORDMARK_RATIO = 2620 / 756;

/** Símbolo de stamp: la cebra con QR. */
export function StampMark({ size = 32, tone = "black", className }: { size?: number; tone?: Tone; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- SVG estático de marca
    <img
      src={`/brand/stamp-mark-${tone}.svg`}
      alt=""
      aria-hidden
      width={Math.round(size * MARK_RATIO)}
      height={size}
      className={cn("shrink-0", className)}
      style={{ height: size, width: "auto" }}
    />
  );
}

/** Logo horizontal: símbolo + "stamp". `height` es el alto del símbolo. */
export function StampLogo({ height = 32, tone = "black", className }: { height?: number; tone?: Tone; className?: string }) {
  const word = Math.round(height * 0.62);
  return (
    <span className={cn("inline-flex items-center gap-[0.35em]", className)} style={{ fontSize: height }}>
      <StampMark size={height} tone={tone} />
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG estático de marca */}
      <img
        src={`/brand/stamp-wordmark-${tone}.svg`}
        alt="stamp"
        width={Math.round(word * WORDMARK_RATIO)}
        height={word}
        style={{ height: word, width: "auto", marginTop: Math.round(height * 0.18) }}
      />
    </span>
  );
}

/** Logo apilado (símbolo arriba, "stamp" abajo), como en el logo original. */
export function StampLogoStacked({ width = 160, tone = "black", className }: { width?: number; tone?: Tone; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- SVG estático de marca
    <img
      src={`/brand/stamp-full-${tone}.svg`}
      alt="stamp"
      width={width}
      height={Math.round(width * (2572 / 2620))}
      className={className}
      style={{ width, height: "auto" }}
    />
  );
}

/** Crédito discreto para las páginas con la marca de cada negocio. */
export function PoweredByStamp({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground", className)}
    >
      Funciona con <StampLogo height={14} />
    </Link>
  );
}
