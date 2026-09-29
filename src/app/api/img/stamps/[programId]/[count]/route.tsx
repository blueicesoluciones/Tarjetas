import { ImageResponse } from "next/og";
import { stampGrid } from "@/lib/cards/stamp-layout";
import { createAdminClient } from "@/lib/supabase/admin";

const WIDTH = 1032;
const HEIGHT = 336;

/**
 * Imagen de sellos: hero de Google Wallet y strip de Apple (CLAUDE.md §10.1).
 * La URL cambia con el conteo y design_version, así que se cachea inmutable.
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/img/stamps/[programId]/[count]">) {
  const { programId, count: countParam } = await ctx.params;
  const count = Number(countParam);
  if (!/^[0-9a-f-]{36}$/i.test(programId) || !Number.isInteger(count) || count < 0 || count > 1000) {
    return new Response("Not found", { status: 404 });
  }

  const { data: program } = await createAdminClient()
    .from("programs")
    .select("stamps_required, businesses(primary_color, text_color)")
    .eq("id", programId)
    .maybeSingle<{ stamps_required: number; businesses: { primary_color: string; text_color: string } }>();
  if (!program) return new Response("Not found", { status: 404 });

  const required = program.stamps_required;
  const bg = program.businesses.primary_color;
  const fg = program.businesses.text_color;
  const reward = count >= required;
  const filled = Math.min(count, required);
  const { rows, cols } = stampGrid(required);

  const padding = 40;
  const gap = rows === 1 ? 18 : 14;
  const bannerHeight = reward ? 56 : 0;
  const size = Math.floor(
    Math.min(
      (WIDTH - padding * 2 - gap * (cols - 1)) / cols,
      (HEIGHT - padding * 2 - bannerHeight - gap * (rows - 1)) / rows,
    ),
  );

  const circles = Array.from({ length: required }, (_, i) => i < filled);
  const grid = Array.from({ length: rows }, (_, r) => circles.slice(r * cols, (r + 1) * cols));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: bg,
          gap,
        }}
      >
        {grid.map((row, r) => (
          <div key={r} style={{ display: "flex", gap }}>
            {row.map((on, i) => {
              const isLast = r * cols + i === required - 1;
              return (
                <div
                  key={i}
                  style={{
                    width: size,
                    height: size,
                    borderRadius: size,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: `${Math.max(3, Math.round(size / 18))}px solid ${fg}`,
                    backgroundColor: on ? fg : "transparent",
                    opacity: on ? 1 : 0.55,
                  }}
                >
                  {on ? (
                    <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24">
                      <path d="M4 12.5l5 5L20 6.5" fill="none" stroke={bg} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : isLast ? (
                    <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24">
                      <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.5L12 17.3l-5.9 3.2 1.3-6.5-4.9-4.6 6.6-.8z" fill={fg} />
                    </svg>
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
        {reward ? (
          <div
            style={{
              display: "flex",
              marginTop: 6,
              padding: "8px 24px",
              borderRadius: 999,
              backgroundColor: fg,
              color: bg,
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            ¡Premio disponible!
          </div>
        ) : null}
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
    },
  );
}
