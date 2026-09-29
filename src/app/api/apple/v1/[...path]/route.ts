/**
 * Web Service de Apple Wallet (CLAUDE.md §12) — stub.
 *
 * TODO(apple): implementar con autenticación `Authorization: ApplePass <token>`
 * contra cards.apple_auth_token:
 * - POST   devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}/{serialNumber} → 201/200
 * - DELETE devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}/{serialNumber} → 200
 * - GET    devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}?passesUpdatedSince=<tag> → 200/204
 * - GET    passes/{passTypeIdentifier}/{serialNumber} → .pkpass (If-Modified-Since)
 * - POST   log → registrar errores de dispositivos
 */
function notAvailable() {
  const enabled = process.env.APPLE_WALLET_ENABLED === "true";
  return new Response(enabled ? "Not implemented" : "Not found", { status: enabled ? 501 : 404 });
}

export const GET = notAvailable;
export const POST = notAvailable;
export const DELETE = notAvailable;
