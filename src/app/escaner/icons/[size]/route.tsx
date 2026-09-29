import { ImageResponse } from "next/og";

const SIZES = new Set([180, 192, 512]);

export async function GET(_request: Request, ctx: RouteContext<"/escaner/icons/[size]">) {
  const size = Number((await ctx.params).size);
  if (!SIZES.has(size)) return new Response("Not found", { status: 404 });
  const dot = Math.round(size * 0.14);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexWrap: "wrap",
          alignContent: "center",
          justifyContent: "center",
          gap: dot * 0.5,
          padding: size * 0.22,
          backgroundColor: "#111827",
        }}
      >
        {Array.from({ length: 9 }, (_, i) => (
          <div
            key={i}
            style={{
              width: dot,
              height: dot,
              borderRadius: dot,
              backgroundColor: i < 6 ? "#FACC15" : "transparent",
              border: `${Math.max(2, Math.round(dot / 8))}px solid #FACC15`,
            }}
          />
        ))}
      </div>
    ),
    { width: size, height: size, headers: { "Cache-Control": "public, max-age=604800" } },
  );
}
