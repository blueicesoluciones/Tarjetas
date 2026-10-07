import { stampGrid } from "@/lib/cards/stamp-layout";

/**
 * Sellos en HTML para la tarjeta web (nítidos y sobre el mismo fondo de la
 * tarjeta). Misma distribución que la imagen de Google Wallet.
 */
export function StampGrid({
  count,
  required,
  primaryColor,
  textColor,
}: {
  count: number;
  required: number;
  primaryColor: string;
  textColor: string;
}) {
  const { cols } = stampGrid(required);
  return (
    <div
      role="img"
      aria-label={`${count} de ${required} sellos`}
      className="grid gap-2 px-5 py-5"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: required }, (_, i) => {
        const on = i < count;
        return (
          <span
            key={i}
            className="flex aspect-square items-center justify-center rounded-full border-2"
            style={{ borderColor: textColor, backgroundColor: on ? textColor : "transparent", opacity: on ? 1 : 0.55 }}
          >
            {on ? (
              <svg viewBox="0 0 24 24" className="size-[55%]" aria-hidden>
                <path d="M4 12.5l5 5L20 6.5" fill="none" stroke={primaryColor} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : i === required - 1 ? (
              <svg viewBox="0 0 24 24" className="size-[50%]" aria-hidden>
                <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.5L12 17.3l-5.9 3.2 1.3-6.5-4.9-4.6 6.6-.8z" fill={textColor} />
              </svg>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}
