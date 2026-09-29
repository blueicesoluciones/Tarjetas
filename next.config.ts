import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseOrigin = supabaseUrl ? new URL(supabaseUrl).origin : "";
const supabaseWs = supabaseOrigin.replace(/^http/, "ws");

// CSP razonable (CLAUDE.md §7.7). Next.js necesita 'unsafe-inline' para sus
// scripts de hidratación salvo que se use nonce; se puede endurecer después.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // Supabase Storage (logos y fondos): en local se sirve por http://127.0.0.1:54321.
  `img-src 'self' data: blob: https: ${supabaseOrigin}`.trim(),
  "font-src 'self' data:",
  "media-src 'self' blob:",
  `connect-src 'self' ${supabaseOrigin} ${supabaseWs}`.trim(),
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: supabaseOrigin ? [new URL(`${supabaseOrigin}/storage/v1/object/public/**`)] : [],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // El enlace personal es una credencial: no indexar ni filtrar por Referer.
        source: "/t/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
      {
        source: "/escaner/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache" },
          { key: "Service-Worker-Allowed", value: "/escaner" },
        ],
      },
    ];
  },
};

export default nextConfig;
