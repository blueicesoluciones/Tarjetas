import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Solo rutas de staff, login y API de staff. Las rutas públicas del cliente
    // (/n, /t, /api/customers, /api/img) no necesitan la sesión de Supabase.
    "/admin/:path*",
    "/panel/:path*",
    "/escaner/:path*",
    "/login",
    "/auth/:path*",
    "/api/staff/:path*",
  ],
};
