import { customAlphabet } from "nanoid";

// Sin caracteres ambiguos (0/O, 1/l/I) para el código que ve el cajero.
const publicCodeAlphabet = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 16);
const accessTokenAlphabet = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  40,
);

export function newPublicCode(): string {
  return publicCodeAlphabet();
}

/** Token del enlace personal /t/[accessToken]: ≥32 caracteres, URL-safe. */
export function newAccessToken(): string {
  return accessTokenAlphabet();
}
