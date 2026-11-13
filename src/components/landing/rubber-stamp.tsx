import { cn } from "@/lib/utils";

/**
 * Marca de sello de caucho: aro con texto en círculo y un texto grande en el
 * centro, con borde de tinta irregular (filtro SVG). `id` debe ser único en la página.
 */
export function RubberStamp({
  id,
  ring,
  center,
  sub,
  size = 168,
  className,
}: {
  id: string;
  ring: string;
  center: string;
  sub?: string;
  size?: number;
  className?: string;
}) {
  const r = 78;
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      role="img"
      aria-label={[center, sub].filter(Boolean).join(" ")}
      className={cn("pointer-events-none select-none", className)}
    >
      <defs>
        <filter id={`${id}-ink`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3" seed="4" result="warp" />
          <feDisplacementMap in="SourceGraphic" in2="warp" scale="2.6" result="rough" />
          <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="9" result="speck" />
          <feColorMatrix
            in="speck"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -4 0 0 0 3.3"
            result="holes"
          />
          <feComposite in="rough" in2="holes" operator="in" />
        </filter>
        <path
          id={`${id}-path`}
          d={`M100,100 m-${r},0 a${r},${r} 0 1,1 ${r * 2},0 a${r},${r} 0 1,1 -${r * 2},0`}
        />
      </defs>
      <g filter={`url(#${id}-ink)`} fill="currentColor" stroke="currentColor">
        <circle cx="100" cy="100" r="95" fill="none" strokeWidth="6" />
        <circle cx="100" cy="100" r="62" fill="none" strokeWidth="3" />
        <text fontSize="17" fontWeight="700" letterSpacing="3.2" stroke="none" aria-hidden>
          <textPath href={`#${id}-path`} startOffset="0">
            {ring}
          </textPath>
        </text>
        <text
          x="100"
          y={sub ? 104 : 112}
          textAnchor="middle"
          fontSize={center.length > 3 ? 30 : 52}
          fontWeight="800"
          letterSpacing="-1"
          stroke="none"
          aria-hidden
        >
          {center}
        </text>
        {sub ? (
          <text
            x="100"
            y="128"
            textAnchor="middle"
            fontSize="15"
            fontWeight="700"
            letterSpacing="2"
            stroke="none"
            aria-hidden
          >
            {sub}
          </text>
        ) : null}
      </g>
    </svg>
  );
}
