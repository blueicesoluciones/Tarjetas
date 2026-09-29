import "server-only";
import { JWT } from "google-auth-library";
import jwt from "jsonwebtoken";
import { appUrl, serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { WalletCardData, WalletProgramData, WalletProvider } from "./types";

const BASE_URL = "https://walletobjects.googleapis.com/walletobjects/v1";
const SCOPE = "https://www.googleapis.com/auth/wallet_object.issuer";

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

let cachedAccount: ServiceAccount | null = null;
let cachedClient: JWT | null = null;

function serviceAccount(): ServiceAccount {
  if (!cachedAccount) {
    const raw = serverEnv().GOOGLE_WALLET_SERVICE_ACCOUNT_JSON_BASE64;
    if (!raw) throw new Error("Falta GOOGLE_WALLET_SERVICE_ACCOUNT_JSON_BASE64");
    const parsed = JSON.parse(Buffer.from(raw, "base64").toString("utf8")) as ServiceAccount;
    cachedAccount = { client_email: parsed.client_email, private_key: parsed.private_key };
  }
  return cachedAccount;
}

function client(): JWT {
  if (!cachedClient) {
    const sa = serviceAccount();
    cachedClient = new JWT({ email: sa.client_email, key: sa.private_key, scopes: [SCOPE] });
  }
  return cachedClient;
}

function issuerId(): string {
  const id = serverEnv().GOOGLE_WALLET_ISSUER_ID;
  if (!id) throw new Error("Falta GOOGLE_WALLET_ISSUER_ID");
  return id;
}

export function googleClassId(programId: string): string {
  return `${issuerId()}.program_${programId.replace(/-/g, "")}`;
}

export function googleObjectId(cardId: string): string {
  return `${issuerId()}.card_${cardId.replace(/-/g, "")}`;
}

function status(err: unknown): number | undefined {
  return (err as { response?: { status?: number } })?.response?.status;
}

/** POST y, si ya existe (409), PATCH. */
async function upsert(resource: "loyaltyClass" | "loyaltyObject", id: string, body: object) {
  try {
    await client().request({ url: `${BASE_URL}/${resource}`, method: "POST", data: body });
  } catch (err) {
    if (status(err) !== 409) throw err;
    await client().request({ url: `${BASE_URL}/${resource}/${encodeURIComponent(id)}`, method: "PATCH", data: body });
  }
}

function localized(value: string) {
  return { defaultValue: { language: "es", value } };
}

function classBody(program: WalletProgramData) {
  return {
    id: googleClassId(program.programId),
    issuerName: program.businessName,
    localizedIssuerName: localized(program.businessName),
    programName: program.cardTitle,
    localizedProgramName: localized(program.cardTitle),
    programLogo: {
      sourceUri: { uri: program.logoUrl },
      contentDescription: localized(program.businessName),
    },
    hexBackgroundColor: program.primaryColor,
    reviewStatus: "UNDER_REVIEW",
  };
}

function objectPatch(data: WalletCardData) {
  return {
    state: "ACTIVE",
    accountName: data.customerName,
    accountId: data.publicCode,
    loyaltyPoints: {
      label: "Sellos",
      balance: { string: `${data.stampsCount} / ${data.stampsRequired}` },
    },
    heroImage: {
      sourceUri: { uri: data.stampsImageUrl },
      contentDescription: localized(`${data.stampsCount} de ${data.stampsRequired} sellos`),
    },
    textModulesData: [
      {
        id: "reward",
        header: data.rewardAvailable ? "¡Premio disponible!" : "Premio",
        body: data.rewardDescription,
      },
    ],
  };
}

function objectBody(data: WalletCardData) {
  return {
    id: googleObjectId(data.cardId),
    classId: googleClassId(data.programId),
    ...objectPatch(data),
    barcode: { type: "QR_CODE", value: data.qrValue, alternateText: data.publicCode },
    linksModuleData: {
      uris: [{ id: "web", uri: data.webCardUrl, description: "Ver mi tarjeta" }],
    },
  };
}

export const googleWallet: WalletProvider = {
  id: "google",

  isEnabled() {
    const env = serverEnv();
    return Boolean(env.GOOGLE_WALLET_ISSUER_ID && env.GOOGLE_WALLET_SERVICE_ACCOUNT_JSON_BASE64);
  },

  async ensureProgram(program) {
    const id = googleClassId(program.programId);
    await upsert("loyaltyClass", id, classBody(program));
    if (program.googleClassId !== id) {
      await createAdminClient().from("programs").update({ google_class_id: id }).eq("id", program.programId);
    }
  },

  async createCard(data) {
    const id = googleObjectId(data.cardId);
    await upsert("loyaltyObject", id, objectBody(data));
    if (data.googleObjectId !== id) {
      await createAdminClient().from("cards").update({ google_object_id: id }).eq("id", data.cardId);
    }
  },

  async getAddToWalletUrl(data) {
    const sa = serviceAccount();
    const token = jwt.sign(
      {
        iss: sa.client_email,
        aud: "google",
        typ: "savetowallet",
        origins: [appUrl()],
        payload: { loyaltyObjects: [{ id: googleObjectId(data.cardId) }] },
      },
      sa.private_key,
      { algorithm: "RS256" },
    );
    return `https://pay.google.com/gp/v/save/${token}`;
  },

  async syncCard(data, message) {
    if (!data.googleObjectId) return; // el objeto aún no existe; se crea al pedir "Agregar"
    const id = encodeURIComponent(data.googleObjectId);
    await client().request({ url: `${BASE_URL}/loyaltyObject/${id}`, method: "PATCH", data: objectPatch(data) });
    if (message) {
      await client().request({
        url: `${BASE_URL}/loyaltyObject/${id}/addMessage`,
        method: "POST",
        data: {
          message: {
            header: data.businessName,
            body: message,
            messageType: "TEXT_AND_NOTIFY",
            id: `msg_${Date.now()}`,
          },
        },
      });
    }
  },
};
