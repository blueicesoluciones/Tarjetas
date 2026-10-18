import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import forge from "node-forge";

/**
 * Certificados de Pass Type ID por negocio: clave + solicitud (CSR) generadas en
 * el servidor, y validación del certificado que entrega Apple.
 */

export const PASS_TYPE_ID_RE = /^pass\.[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;

/** Identificador sugerido para un negocio: pass.com.blueicesoluciones.<slug>. */
export function suggestedPassTypeId(sharedPassTypeId: string, slug: string): string {
  const base = sharedPassTypeId.replace(/\.[^.]+$/, "");
  return `${base}.${slug.toLowerCase().replace(/[^a-z0-9-]/g, "-")}`;
}

export function generateKeyAndCsr(passTypeId: string): { keyPem: string; csrPem: string } {
  const keys = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 });
  const csr = forge.pki.createCertificationRequest();
  csr.publicKey = keys.publicKey;
  csr.setSubject([{ name: "commonName", value: passTypeId }]);
  csr.sign(keys.privateKey, forge.md.sha256.create());
  return {
    keyPem: forge.pki.privateKeyToPem(keys.privateKey),
    csrPem: forge.pki.certificationRequestToPem(csr),
  };
}

// --- Cifrado de la clave privada (AES-256-GCM) ------------------------------

function aesKey(secret: string) {
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(plain: string, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", aesKey(secret), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), data.toString("base64")].join(
    ":",
  );
}

export function decryptSecret(encoded: string, secret: string): string {
  const [version, iv, tag, data] = encoded.split(":");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Formato de clave cifrada inválido");
  const decipher = createDecipheriv("aes-256-gcm", aesKey(secret), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
}

// --- Certificado de Apple ----------------------------------------------------

export interface ParsedPassCert {
  certPem: string;
  passTypeId: string;
  teamId: string;
  expiresAt: Date;
}

/** Acepta el pass.cer de Apple (DER) o un PEM. */
export function parsePassCertificate(file: Buffer): ParsedPassCert {
  let cert: forge.pki.Certificate;
  try {
    const text = file.toString("utf8");
    cert = text.includes("-----BEGIN CERTIFICATE-----")
      ? forge.pki.certificateFromPem(text)
      : forge.pki.certificateFromAsn1(forge.asn1.fromDer(forge.util.createBuffer(file.toString("binary"))));
  } catch {
    throw new Error("El archivo no es un certificado válido. Sube el archivo .cer que descargaste de Apple.");
  }
  const attr = (shortName: string, oid?: string) =>
    String(
      cert.subject.attributes.find((a) => a.shortName === shortName || (oid && a.type === oid))?.value ?? "",
    );
  // UID (0.9.2342.19200300.100.1.1) = Pass Type ID; OU = Team ID.
  const passTypeId = attr("UID", "0.9.2342.19200300.100.1.1");
  const teamId = attr("OU");
  if (!PASS_TYPE_ID_RE.test(passTypeId)) {
    throw new Error("Ese certificado no es de un Pass Type ID. En Apple elige «Pass Type ID Certificate».");
  }
  return { certPem: forge.pki.certificateToPem(cert), passTypeId, teamId, expiresAt: cert.validity.notAfter };
}

/** ¿El certificado corresponde a esta clave privada (misma clave pública)? */
export function certMatchesKey(certPem: string, keyPem: string): boolean {
  const cert = forge.pki.certificateFromPem(certPem);
  const key = forge.pki.privateKeyFromPem(keyPem);
  const pub = cert.publicKey as forge.pki.rsa.PublicKey;
  return pub.n.equals(key.n) && pub.e.equals(key.e);
}
