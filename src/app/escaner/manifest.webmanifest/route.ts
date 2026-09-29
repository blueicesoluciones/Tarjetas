export function GET() {
  const manifest = {
    name: "Sellos · Escáner",
    short_name: "Escáner",
    start_url: "/escaner",
    scope: "/escaner",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0a",
    theme_color: "#111827",
    icons: [
      { src: "/escaner/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/escaner/icons/512", sizes: "512x512", type: "image/png" },
      { src: "/escaner/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return Response.json(manifest, {
    headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" },
  });
}
