import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";

/** Logo de respaldo (inicial del negocio) para negocios sin logo propio. */
export async function GET(_request: Request, ctx: RouteContext<"/api/img/logo/[programId]">) {
  const { programId } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(programId)) return new Response("Not found", { status: 404 });

  const { data } = await createAdminClient()
    .from("programs")
    .select("businesses(name, primary_color, text_color)")
    .eq("id", programId)
    .maybeSingle<{ businesses: { name: string; primary_color: string; text_color: string } }>();
  if (!data) return new Response("Not found", { status: 404 });

  const { name, primary_color, text_color } = data.businesses;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: primary_color,
          color: text_color,
          fontSize: 300,
          fontWeight: 700,
        }}
      >
        {name.trim().charAt(0).toUpperCase()}
      </div>
    ),
    { width: 660, height: 660, headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
