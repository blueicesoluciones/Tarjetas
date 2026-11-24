import { ImageResponse } from "next/og";
import { BACKGROUND_OVERLAY_ALPHA } from "@/lib/cards/card-style";
import { GIFT_ICON_PATHS, stampGrid } from "@/lib/cards/stamp-layout";
import { cardStampLogos } from "@/lib/cards/stamp-logos";
import { resolveStampStyle, STAMP_ICON_SHAPES } from "@/lib/cards/stamp-style";
import { planFeatures, type Plan } from "@/lib/plans";
import { getProgramMilestones } from "@/lib/rewards-server";
import { createAdminClient } from "@/lib/supabase/admin";

// Google Wallet (hero): 1032×336. Apple Wallet (strip de storeCard): 375×144 pt,
// generada a @3x (1125×432) para que iOS no la recorte por los lados.
const SIZES = { google: { width: 1032, height: 336 }, apple: { width: 1125, height: 432 } } as const;

/**
 * Imagen de sellos: hero de Google Wallet y strip de Apple (CLAUDE.md §10.1).
 * La URL cambia con el conteo y design_version, así que se cachea inmutable.
 */
/**
 * Descarga los logos de las sedes y los pasa como data URI: si uno falla, ese
 * sello se dibuja con el chulo en vez de romper toda la imagen.
 */
async function logoDataUris(logos: (string | null)[]): Promise<(string | null)[]> {
  const unique = [...new Set(logos.filter((l): l is string => Boolean(l)))];
  const loaded = new Map<string, string | null>();
  await Promise.all(
    unique.map(async (url) => {
      try {
        const res = await fetch(url);
        const type = res.headers.get("content-type") ?? "";
        if (!res.ok || !type.startsWith("image/")) throw new Error(`HTTP ${res.status}`);
        loaded.set(url, `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`);
      } catch (err) {
        console.error("[stamps] imagen de sello", url, err instanceof Error ? err.message : err);
        loaded.set(url, null);
      }
    }),
  );
  return logos.map((l) => (l ? (loaded.get(l) ?? null) : null));
}

/** "#abc" o "#aabbcc" → [r, g, b]. */
function rgbOf(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  const n = /^[0-9a-f]{6}$/i.test(h) ? parseInt(h, 16) : 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = rgbOf(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export async function GET(request: Request, ctx: RouteContext<"/api/img/stamps/[programId]/[count]">) {
  const { programId, count: countParam } = await ctx.params;
  const params = new URL(request.url).searchParams;
  const { width: WIDTH, height: HEIGHT } = SIZES[params.get("f") === "apple" ? "apple" : "google"];
  const cardId = params.get("c");
  const count = Number(countParam);
  if (
    !/^[0-9a-f-]{36}$/i.test(programId) ||
    !Number.isInteger(count) ||
    count < 0 ||
    count > 1000 ||
    (cardId !== null && !/^[0-9a-f-]{36}$/i.test(cardId))
  ) {
    return new Response("Not found", { status: 404 });
  }

  const { data: program } = await createAdminClient()
    .from("programs")
    .select("stamps_required, business_id, stamp_icon, stamp_image_url, businesses(primary_color, text_color, card_background_url, plan)")
    .eq("id", programId)
    .maybeSingle<{
      stamps_required: number;
      business_id: string;
      stamp_icon: string;
      stamp_image_url: string | null;
      businesses: { primary_color: string; text_color: string; card_background_url: string | null; plan: Plan };
    }>();
  if (!program) return new Response("Not found", { status: 404 });

  // Multisede: imagen de una tarjeta con el logo de la sede en cada sello.
  let logos: (string | null)[] = [];
  if (cardId) {
    const { data: card } = await createAdminClient()
      .from("cards")
      .select("id")
      .eq("id", cardId)
      .eq("program_id", programId)
      .maybeSingle<{ id: string }>();
    if (!card) return new Response("Not found", { status: 404 });
    const urls = await cardStampLogos({ id: card.id, businessId: program.business_id, stampsCount: count, plan: program.businesses.plan });
    if (urls) logos = await logoDataUris(urls);
  }

  // Diseño del sello (Medium y Pro): ícono o imagen propia, salvo donde haya logo de sede.
  const stamp = resolveStampStyle(
    planFeatures(program.businesses.plan).customStamp,
    program.stamp_icon,
    program.stamp_image_url,
  );
  const stampImage = stamp.imageUrl ? (await logoDataUris([stamp.imageUrl]))[0] : null;
  const shape = STAMP_ICON_SHAPES[stamp.icon];

  const required = program.stamps_required;
  const milestones = (await getProgramMilestones(programId, program.businesses.plan, required)).map((m) => m.stampsAt);
  const bg = program.businesses.primary_color;
  const fg = program.businesses.text_color;
  const backgroundUrl = program.businesses.card_background_url;
  const reward = count >= required;
  const filled = Math.min(count, required);
  const { rows, cols } = stampGrid(required);

  const padding = 40;
  const sidePadding = 90; // aire a los lados: los sellos no llenan todo el ancho
  const gap = rows === 1 ? 40 : 30;
  const bannerHeight = reward ? 60 : 0;
  const size = Math.floor(
    Math.min(
      (WIDTH - sidePadding * 2 - gap * (cols - 1)) / cols,
      (HEIGHT - padding * 2 - bannerHeight - gap * (rows - 1)) / rows,
    ),
  );

  // Trazos finos y parejos: aro de los sellos y línea del camino.
  const border = Math.max(2, Math.round(size / 40));
  const track = Math.max(2, Math.round(size / 48));
  const circles = Array.from({ length: required }, (_, i) => i < filled);
  const grid = Array.from({ length: rows }, (_, r) => circles.slice(r * cols, (r + 1) * cols));
  // Próximo círculo con premio (intermedio o final) aún sin llenar: se resalta.
  const nextPrize = Array.from({ length: required }, (_, i) => i).find(
    (i) => i >= filled && (i === required - 1 || milestones.includes(i + 1)),
  );
  const gift = (color: string, px: number, stroke = 1.6) => (
    <svg width={px} height={px} viewBox="0 0 24 24">
      {GIFT_ICON_PATHS.map((d) => (
        <path key={d} d={d} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
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
          gap: reward ? 18 : 0,
          position: "relative",
        }}
      >
        {backgroundUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- Satori solo entiende <img>
          <img
            src={backgroundUrl}
            alt=""
            width={WIDTH}
            height={HEIGHT}
            style={{ position: "absolute", top: 0, left: 0, width: WIDTH, height: HEIGHT, objectFit: "cover" }}
          />
        ) : null}
        {backgroundUrl ? (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: WIDTH,
              height: HEIGHT,
              backgroundColor: `${bg}${BACKGROUND_OVERLAY_ALPHA}`,
            }}
          />
        ) : null}
        {backgroundUrl ? (
          // En Google Wallet la parte superior del pase es de color sólido (no admite
          // foto de fondo): la imagen arranca con ese color y se funde con la foto
          // para que la tarjeta se vea continua.
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: WIDTH,
              height: HEIGHT,
              backgroundImage: `linear-gradient(to bottom, ${bg} 0%, ${bg}E6 18%, ${bg}00 70%)`,
            }}
          />
        ) : null}
        {/* El camino: cada fila une sus sellos con una línea; el tramo recorrido va sólido. */}
        <div style={{ display: "flex", flexDirection: "column", gap }}>
          {grid.map((row, r) => {
            const done = row.filter(Boolean).length;
            const step = size + gap;
            return (
              <div key={r} style={{ display: "flex", gap, position: "relative" }}>
                {/* Camino: un tramo fino entre cada par de sellos; sólido si ya se recorrió. */}
                {row.slice(1).map((_, j) => (
                  <div
                    key={`t${j}`}
                    style={{
                      position: "absolute",
                      top: size / 2 - track / 2,
                      left: j * step + size + Math.round(gap * 0.18),
                      width: gap - Math.round(gap * 0.36),
                      height: track,
                      borderRadius: track,
                      backgroundColor: j + 1 < done ? fg : rgba(fg, 0.3),
                    }}
                  />
                ))}
                {row.map((on, i) => {
                  const index = r * cols + i;
                  const hasReward = index === required - 1 || milestones.includes(index + 1);
                  const image = on ? (logos[index] ?? stampImage) : null;
                  const isNext = index === nextPrize;
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
                        position: "relative",
                        // Sin rellenos ni sombras: el puesto es un disco sólido y el
                        // pendiente, solo un aro fino.
                        ...(on
                          ? { backgroundColor: fg }
                          : {
                              border: `${border}px solid ${hasReward || isNext ? fg : rgba(fg, 0.45)}`,
                            }),
                      }}
                    >
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element -- Satori solo entiende <img>
                        <img
                          src={image}
                          alt=""
                          width={size - 4}
                          height={size - 4}
                          style={{ width: size - 4, height: size - 4, borderRadius: size, objectFit: "cover" }}
                        />
                      ) : on ? (
                        <svg width={size * 0.42} height={size * 0.42} viewBox="0 0 24 24">
                          <path
                            d={shape.d}
                            fill={shape.fill ? bg : "none"}
                            stroke={shape.fill ? "none" : bg}
                            strokeWidth={3.2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : hasReward ? (
                        gift(fg, Math.round(size * 0.44))
                      ) : (
                        // Número del sello: la tarjeta se lee como un recorrido.
                        <div
                          style={{
                            display: "flex",
                            fontSize: Math.round(size * 0.3),
                            letterSpacing: 1,
                            color: rgba(fg, 0.6),
                          }}
                        >
                          {index + 1}
                        </div>
                      )}
                      {on && !image ? (
                        // Aro interior fino, como el borde de un sello de caucho.
                        <div
                          style={{
                            position: "absolute",
                            top: Math.round(size * 0.08),
                            left: Math.round(size * 0.08),
                            width: size - Math.round(size * 0.08) * 2,
                            height: size - Math.round(size * 0.08) * 2,
                            borderRadius: size,
                            border: `${Math.max(1.5, border * 0.75)}px solid ${rgba(bg, 0.55)}`,
                          }}
                        />
                      ) : null}
                      {on && hasReward ? (
                        // Premio ganado en este sello: insignia con regalo.
                        <div
                          style={{
                            position: "absolute",
                            right: -Math.round(size * 0.06),
                            bottom: -Math.round(size * 0.06),
                            width: Math.round(size * 0.38),
                            height: Math.round(size * 0.38),
                            borderRadius: size,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: bg,
                            border: `${border}px solid ${fg}`,
                          }}
                        >
                          {gift(fg, Math.round(size * 0.22), 2)}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        {reward ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "8px 26px 8px 20px",
              borderRadius: 999,
              backgroundColor: fg,
              color: bg,
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            {gift(bg, 32, 2.2)}
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
