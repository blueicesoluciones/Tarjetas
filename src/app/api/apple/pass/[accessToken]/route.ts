/**
 * Descarga del .pkpass — stub (CLAUDE.md §12).
 * TODO(apple): generar con passkit-generator y responder con
 * `Content-Type: application/vnd.apple.pkpass`.
 */
export function GET() {
  const enabled = process.env.APPLE_WALLET_ENABLED === "true";
  return new Response(enabled ? "Not implemented" : "Not found", { status: enabled ? 501 : 404 });
}
