import { rubberStampBody, rubberStampDefs, STAMP_TILTS } from "@/lib/cards/rubber-stamp-svg";
import { GIFT_ICON_PATHS, stampGrid } from "@/lib/cards/stamp-layout";
import { DEFAULT_STAMP_STYLE, STAMP_ICON_SHAPES, type StampStyle } from "@/lib/cards/stamp-style";

/**
 * Sellos de la tarjeta web y de las vistas previas del panel. Cada casilla es un
 * sello de caucho, el mismo dibujo que la imagen de Wallet (rubber-stamp-svg.ts):
 * vacía en tinta tenue con su número, con premio con un regalo, y puesta en
 * tinta plena, inclinada, con el ícono o el logo adentro.
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
  // Las definiciones solo dependen del ícono: si se repiten en la página son idénticas.
  const prefix = `rs-${stamp.icon}`;
  return (
    <div
      role="img"
      aria-label={`${count} de ${required} sellos`}
      className="relative mx-auto grid max-w-md gap-3 px-5 py-5"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {/* Filtros de tinta (no puede ir con display:none o el navegador los ignora). */}
      <svg
        aria-hidden
        width="0"
        height="0"
        className="absolute"
        dangerouslySetInnerHTML={{ __html: `<defs>${rubberStampDefs(prefix, shape)}</defs>` }}
      />
      {Array.from({ length: required }, (_, i) => {
        const on = i < count;
        const image = on ? (logos?.[i] ?? stamp.imageUrl) : null;
        const hasReward = milestones.includes(i + 1) || i === required - 1;
        const body = rubberStampBody(prefix, {
          ink: textColor,
          ...(on
            ? {
                opacity: 1,
                content: image ? { kind: "image" as const, href: image } : { kind: "icon" as const },
                seedIndex: i % 4,
              }
            : hasReward
              ? { opacity: 0.85, content: { kind: "gift" as const } }
              : { opacity: 0.45, content: { kind: "none" as const }, label: String(i + 1) }),
        });
        return (
          <span key={i} className="relative block aspect-square">
            <svg
              viewBox="0 0 200 200"
              className="size-full overflow-visible"
              aria-hidden
              style={on ? { transform: `rotate(${STAMP_TILTS[i % STAMP_TILTS.length]}deg)` } : undefined}
              dangerouslySetInnerHTML={{ __html: body }}
            />
            {on && hasReward ? (
              // Premio ganado en este sello: insignia con regalo.
              <span
                className="absolute -right-0.5 -bottom-0.5 flex size-[36%] items-center justify-center rounded-full"
                style={{ backgroundColor: textColor }}
              >
                <svg viewBox="0 0 24 24" className="size-[62%]" aria-hidden>
                  {GIFT_ICON_PATHS.map((d) => (
                    <path key={d} d={d} fill="none" stroke={primaryColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  ))}
                </svg>
              </span>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}
