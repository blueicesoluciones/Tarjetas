import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Destino de los enlaces de invitación y recuperación generados con
 * `auth.admin.generateLink` (ver src/lib/staff-invite.ts).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && type && ["invite", "recovery", "magiclink", "email"].includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(new URL("/auth/definir-clave", request.url));
    }
  }
  return NextResponse.redirect(new URL("/login?error=enlace", request.url));
}
