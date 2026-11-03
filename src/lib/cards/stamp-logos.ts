import "server-only";
import { createHash } from "node:crypto";
import { planFeatures, type Plan } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import { stampBranchSequence, type StampEventLite } from "./stamp-branches";

/**
 * Multisede (Pro): logo de la sede de cada sello del ciclo actual, en orden.
 * null cuando no aplica (otro plan, ninguna sede con logo o ningún sello de una
 * sede con logo): entonces los sellos se dibujan con el chulo de siempre.
 */
export async function cardStampLogos(card: {
  id: string;
  businessId: string;
  stampsCount: number;
  plan: Plan;
}): Promise<(string | null)[] | null> {
  if (!planFeatures(card.plan).multiBranch || card.stampsCount === 0) return null;
  const admin = createAdminClient();
  const { data: branches } = await admin
    .from("branches")
    .select("id, logo_url")
    .eq("business_id", card.businessId)
    .not("logo_url", "is", null)
    .returns<{ id: string; logo_url: string }[]>();
  if (!branches?.length) return null;

  const { data: events } = await admin
    .from("stamp_events")
    .select("type, delta, stamps_after, branch_id, undone_at")
    .eq("card_id", card.id)
    .order("created_at")
    .order("id")
    .limit(5000)
    .returns<StampEventLite[]>();
  const logoByBranch = new Map(branches.map((b) => [b.id, b.logo_url]));
  const logos = stampBranchSequence(events ?? [], card.stampsCount).map((b) => (b ? (logoByBranch.get(b) ?? null) : null));
  return logos.some(Boolean) ? logos : null;
}

/** Huella corta de los logos: cambia la URL de la imagen cuando cambian. */
export function stampLogosKey(logos: (string | null)[]): string {
  return createHash("sha256").update(logos.map((l) => l ?? "-").join("|")).digest("base64url").slice(0, 12);
}
