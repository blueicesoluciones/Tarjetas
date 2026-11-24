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

/** Mezcla `hex` con `toward` (0 = hex, 1 = toward). */
function mix(hex: string, toward: string, amount: number): string {
  const a = rgbOf(hex);
  const b = rgbOf(toward);
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * amount));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

/** Inclinación leve y fija de cada sello puesto, como un sello de caucho a mano. */
const TILTS = [-7, 4, -3, 6, -5, 3, -6, 5, -2, 7];

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

  const padding = 28;
  const sidePadding = 64; // margen lateral amplio: ningún sello queda pegado al borde
  const gap = rows === 1 ? 22 : 16;
  const bannerHeight = reward ? 60 : 0;
  // Panel translúcido detrás de los sellos.
  const panelPad = rows === 1 ? 22 : 16;
  const size = Math.floor(
    Math.min(
      (WIDTH - sidePadding * 2 - panelPad * 2 - gap * (cols - 1)) / cols,
      (HEIGHT - padding * 2 - panelPad * 2 - bannerHeight - gap * (rows - 1)) / rows,
    ),
  );

  const border = Math.max(3, Math.round(size / 20));
  const circles = Array.from({ length: required }, (_, i) => i < filled);
  const grid = Array.from({ length: rows }, (_, r) => circles.slice(r * cols, (r + 1) * cols));
  // Próximo círculo con premio (intermedio o final) aún sin llenar: se resalta un poco.
  const nextPrize = Array.from({ length: required }, (_, i) => i).find(
    (i) => i >= filled && (i === required - 1 || milestones.includes(i + 1)),
  );
  // Sombra del sello puesto: más marcada sobre fondos claros.
  const [br, bgG, bb] = rgbOf(bg);
  const lightBg = 0.299 * br + 0.587 * bgG + 0.114 * bb > 160;
  const stampShadow = `0 ${Math.round(size / 16)}px ${Math.round(size / 7)}px rgba(0, 0, 0, ${lightBg ? 0.18 : 0.32})`;

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
          // Degradado suave del mismo color: da profundidad sin cambiar la marca.
          // (Satori falla con propiedades en undefined: se agrega solo si aplica.)
          ...(backgroundUrl
            ? {}
            : {
                backgroundImage: `linear-gradient(160deg, ${mix(bg, fg, 0.07)} 0%, ${bg} 45%, ${mix(bg, "#000000", 0.14)} 100%)`,
              }),
          gap: reward ? 14 : 0,
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
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap,
            padding: panelPad,
            borderRadius: Math.round(size / 2 + panelPad),
            backgroundColor: rgba(fg, 0.08),
            border: `2px solid ${rgba(fg, 0.12)}`,
          }}
        >
          {grid.map((row, r) => (
            <div key={r} style={{ display: "flex", gap }}>
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
                      ...(on
                        ? {
                            backgroundColor: fg,
                            border: `${border}px solid ${fg}`,
                            boxShadow: stampShadow,
                            transform: `rotate(${TILTS[index % TILTS.length]}deg)`,
                          }
                        : hasReward
                          ? {
                              backgroundColor: rgba(fg, isNext ? 0.22 : 0.14),
                              border: `${border}px solid ${rgba(fg, isNext ? 0.95 : 0.7)}`,
                            }
                          : {
                              backgroundColor: rgba(fg, 0.1),
                              border: `${Math.max(2, Math.round(border * 0.7))}px dashed ${rgba(fg, 0.45)}`,
                            }),
                    }}
                  >
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element -- Satori solo entiende <img>
                      <img
                        src={image}
                        alt=""
                        width={size - border * 2}
                        height={size - border * 2}
                        style={{ width: size - border * 2, height: size - border * 2, borderRadius: size, objectFit: "cover" }}
                      />
                    ) : on ? (
                      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24">
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
                      <svg width={size * 0.52} height={size * 0.52} viewBox="0 0 24 24">
                        {GIFT_ICON_PATHS.map((d) => (
                          <path key={d} d={d} fill="none" stroke={fg} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                        ))}
                      </svg>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
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
              boxShadow: stampShadow,
            }}
          >
            <svg width={32} height={32} viewBox="0 0 24 24">
              {GIFT_ICON_PATHS.map((d) => (
                <path key={d} d={d} fill="none" stroke={bg} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
              ))}
            </svg>
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
