import { ImageResponse } from "next/og";
import { BACKGROUND_OVERLAY_ALPHA } from "@/lib/cards/card-style";
import { GIFT_ICON_PATHS, stampGrid } from "@/lib/cards/stamp-layout";
import { rubberStampDataUri } from "@/lib/cards/rubber-stamp-image";
import { STAMP_TILTS, type RubberStampContent } from "@/lib/cards/rubber-stamp-svg";
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

  const padding = 34;
  const sidePadding = 80; // aire a los lados: los sellos no llenan todo el ancho
  const gap = rows === 1 ? 36 : 26;
  const bannerHeight = reward ? 60 : 0;
  const size = Math.floor(
    Math.min(
      (WIDTH - sidePadding * 2 - gap * (cols - 1)) / cols,
      (HEIGHT - padding * 2 - bannerHeight - gap * (rows - 1)) / rows,
    ),
  );

  // Cada casilla es un sello de caucho (rubber-stamp-image.ts). Las vacías van en
  // tinta tenue con su número; al sellar, el mismo sello en tinta plena con el
  // ícono o el logo adentro y una leve inclinación, como puesto a mano.
  const rendered = new Map<string, Promise<string>>();
  const icon = { d: shape.d, fill: shape.fill };
  const stampPng = (key: string, opacity: number, content: RubberStampContent, seedIndex: number) => {
    if (!rendered.has(key)) {
      rendered.set(key, rubberStampDataUri({ px: size * 2, ink: fg, opacity, content, icon, seedIndex }));
    }
    return rendered.get(key)!;
  };
  const slots = await Promise.all(
    Array.from({ length: required }, (_, index) => {
      const on = index < filled;
      const hasReward = index === required - 1 || milestones.includes(index + 1);
      if (!on) {
        return hasReward ? stampPng("gift", 0.85, { kind: "gift" }, 0) : stampPng("empty", 0.42, { kind: "none" }, 0);
      }
      const image = logos[index] ?? stampImage;
      const seedIndex = index % 4; // textura distinta entre sellos puestos
      return image
        ? stampPng(`img:${seedIndex}:${image.slice(-40)}:${image.length}`, 1, { kind: "image", href: image }, seedIndex)
        : stampPng(`icon:${seedIndex}`, 1, { kind: "icon" }, seedIndex);
    }),
  );
  const grid = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: Math.min(cols, required - r * cols) }, (_, i) => r * cols + i),
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
        <div style={{ display: "flex", flexDirection: "column", gap }}>
          {grid.map((row, r) => (
            <div key={r} style={{ display: "flex", gap }}>
              {row.map((index) => {
                const on = index < filled;
                const hasReward = index === required - 1 || milestones.includes(index + 1);
                return (
                  <div
                    key={index}
                    style={{
                      width: size,
                      height: size,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- Satori solo entiende <img> */}
                    <img
                      src={slots[index]}
                      alt=""
                      width={size}
                      height={size}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: size,
                        height: size,
                        ...(on ? { transform: `rotate(${STAMP_TILTS[index % STAMP_TILTS.length]}deg)` } : {}),
                      }}
                    />
                    {!on && !hasReward ? (
                      <div style={{ display: "flex", fontSize: Math.round(size * 0.3), color: rgba(fg, 0.55) }}>
                        {index + 1}
                      </div>
                    ) : null}
                    {on && hasReward ? (
                      // Premio ganado en este sello: insignia con regalo.
                      <div
                        style={{
                          position: "absolute",
                          right: -Math.round(size * 0.04),
                          bottom: -Math.round(size * 0.04),
                          width: Math.round(size * 0.36),
                          height: Math.round(size * 0.36),
                          borderRadius: size,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: fg,
                        }}
                      >
                        {gift(bg, Math.round(size * 0.22), 2)}
                      </div>
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
