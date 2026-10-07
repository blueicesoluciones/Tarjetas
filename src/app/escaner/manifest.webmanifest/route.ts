export function GET() {
  const manifest = {
    name: "stamp · Escáner",
    short_name: "stamp",
    start_url: "/escaner",
    scope: "/escaner",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0D0D0D",
    theme_color: "#0D0D0D",
    icons: [
      { src: "/escaner/icons/192.png", sizes: "192x192", type: "image/png" },
      { src: "/escaner/icons/512.png", sizes: "512x512", type: "image/png" },
      { src: "/escaner/icons/512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return Response.json(manifest, {
    headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" },
  });
}
