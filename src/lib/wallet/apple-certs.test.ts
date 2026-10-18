import forge from "node-forge";
import { describe, expect, it } from "vitest";
import {
  certMatchesKey,
  decryptSecret,
  encryptSecret,
  generateKeyAndCsr,
  parsePassCertificate,
  suggestedPassTypeId,
} from "./apple-certs";

/** Certificado al estilo de Apple (UID = Pass Type ID, OU = Team ID) firmado con la clave del CSR. */
function fakeAppleCert(keyPem: string, uid: string, der = true): Buffer {
  const key = forge.pki.privateKeyFromPem(keyPem);
  const cert = forge.pki.createCertificate();
  cert.publicKey = forge.pki.setRsaPublicKey(key.n, key.e);
  cert.serialNumber = "01";
  cert.validity.notBefore = new Date("2026-10-01T00:00:00Z");
  cert.validity.notAfter = new Date("2027-11-01T00:00:00Z");
  cert.setSubject([
    { type: "0.9.2342.19200300.100.1.1", value: uid },
    { shortName: "OU", value: "TEAM123456" },
    { shortName: "CN", value: `Pass Type ID: ${uid}` },
  ]);
  cert.setIssuer([{ shortName: "CN", value: "Fake WWDR" }]);
  cert.sign(key, forge.md.sha256.create());
  if (!der) return Buffer.from(forge.pki.certificateToPem(cert));
  return Buffer.from(forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes(), "binary");
}

describe("apple-certs", () => {
  const { keyPem, csrPem } = generateKeyAndCsr("pass.com.example.cafe");

  it("sugiere el identificador con el slug del negocio", () => {
    expect(suggestedPassTypeId("pass.com.blueicesoluciones.stamp", "strawberry-cerrito")).toBe(
      "pass.com.blueicesoluciones.strawberry-cerrito",
    );
  });

  it("genera una solicitud CSR válida", () => {
    expect(csrPem).toContain("BEGIN CERTIFICATE REQUEST");
    expect(forge.pki.certificationRequestFromPem(csrPem).verify()).toBe(true);
  });

  it("cifra y descifra la clave; con otro secreto falla", () => {
    const enc = encryptSecret(keyPem, "secreto-1");
    expect(enc).not.toContain("PRIVATE KEY");
    expect(decryptSecret(enc, "secreto-1")).toBe(keyPem);
    expect(() => decryptSecret(enc, "secreto-2")).toThrow();
  });

  it("lee el .cer de Apple (DER o PEM) y comprueba la clave", () => {
    for (const der of [true, false]) {
      const parsed = parsePassCertificate(fakeAppleCert(keyPem, "pass.com.example.cafe", der));
      expect(parsed.passTypeId).toBe("pass.com.example.cafe");
      expect(parsed.teamId).toBe("TEAM123456");
      expect(parsed.expiresAt.toISOString()).toBe("2027-11-01T00:00:00.000Z");
      expect(certMatchesKey(parsed.certPem, keyPem)).toBe(true);
    }
    const other = generateKeyAndCsr("pass.com.example.otro").keyPem;
    expect(
      certMatchesKey(parsePassCertificate(fakeAppleCert(keyPem, "pass.com.example.cafe")).certPem, other),
    ).toBe(false);
  });

  it("rechaza archivos que no son certificados de pase", () => {
    expect(() => parsePassCertificate(Buffer.from("hola"))).toThrow(/no es un certificado/);
    expect(() => parsePassCertificate(fakeAppleCert(keyPem, "com.example.app"))).toThrow(/Pass Type ID/);
  });
});
