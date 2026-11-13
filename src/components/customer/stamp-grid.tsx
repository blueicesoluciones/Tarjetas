import { GIFT_ICON_PATHS, stampGrid } from "@/lib/cards/stamp-layout";
import { DEFAULT_STAMP_STYLE, STAMP_ICON_SHAPES, type StampStyle } from "@/lib/cards/stamp-style";

/**
 * Sellos en HTML para la tarjeta web (nítidos y sobre el mismo fondo de la
 * tarjeta). Misma distribución que la imagen de Wallet.
 */
export function StampGrid({
  count,
  required,
  primaryColor,
  textColor,
  milestones = [],
  logos,
  stamp = DEFAULT_STAMP_STYLE,
}: {
  count: number;
  required: number;
  primaryColor: string;
  textColor: string;
  /** Sellos en los que hay premio intermedio (se marcan con un regalo). */
  milestones?: number[];
  /** Multisede: logo de la sede de cada sello puesto (null = diseño del sello). */
  logos?: (string | null)[] | null;
  /** Diseño de los sellos puestos (ícono o imagen). */
  stamp?: StampStyle;
}) {
  const { cols } = stampGrid(required);
  const shape = STAMP_ICON_SHAPES[stamp.icon];
  return (
    <div
      role="img"
      aria-label={`${count} de ${required} sellos`}
      className="mx-auto grid max-w-md gap-3 px-5 py-5"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: required }, (_, i) => {
        const on = i < count;
        const image = on ? (logos?.[i] ?? stamp.imageUrl) : null;
        const hasReward = milestones.includes(i + 1) || i === required - 1;
        return (
          <span
            key={i}
            className="flex aspect-square items-center justify-center rounded-full border-2"
            style={{ borderColor: textColor, backgroundColor: on ? textColor : "transparent", opacity: on ? 1 : 0.55 }}
          >
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element -- imagen del sello, ya redonda
              <img src={image} alt="" className="size-full rounded-full object-cover" />
            ) : on ? (
              <svg viewBox="0 0 24 24" className="size-[55%]" aria-hidden>
                <path
                  d={shape.d}
                  fill={shape.fill ? primaryColor : "none"}
                  stroke={shape.fill ? "none" : primaryColor}
                  strokeWidth={3.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : hasReward ? (
              <svg viewBox="0 0 24 24" className="size-[52%]" aria-hidden>
                {GIFT_ICON_PATHS.map((d) => (
                  <path key={d} d={d} fill="none" stroke={textColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                ))}
              </svg>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}
