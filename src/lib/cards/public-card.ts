import "server-only";
import { cache } from "react";
import type { Plan } from "@/lib/plans";
import { milestoneStatuses, type MilestoneStatus } from "@/lib/rewards";
import { getProgramMilestones } from "@/lib/rewards-server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface PublicCardView {
  id: string;
  publicCode: string;
  accessToken: string;
  stampsCount: number;
  totalRedemptions: number;
  status: "active" | "blocked";
  customerName: string;
  /** Inscrito antes de pedir el cumpleaños: la tarjeta web le pide completarlo. */
  needsBirthday: boolean;
  /** Premios intermedios del ciclo actual (vacío si el plan no los incluye). */
  milestones: MilestoneStatus[];
  program: {
    id: string;
    cardTitle: string;
    stampsRequired: number;
    rewardDescription: string;
    designVersion: number;
  };
  business: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    backgroundUrl: string | null;
    primaryColor: string;
    textColor: string;
    status: "trial" | "active" | "suspended";
  };
}

interface Row {
  id: string;
  public_code: string;
  access_token: string;
  stamps_count: number;
  total_redemptions: number;
  claimed_milestones: number[];
  status: "active" | "blocked";
  customers: { full_name: string; birth_month: number | null; deleted_at: string | null };
  programs: { id: string; card_title: string; stamps_required: number; reward_description: string; design_version: number };
  businesses: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    card_background_url: string | null;
    primary_color: string;
    text_color: string;
    status: "trial" | "active" | "suspended";
    plan: Plan;
  };
}

/** Tarjeta por access_token (enlace personal). Solo lectura. */
export const getCardByAccessToken = cache(async (accessToken: string): Promise<PublicCardView | null> => {
  if (!/^[A-Za-z0-9_-]{32,80}$/.test(accessToken)) return null;
  const { data } = await createAdminClient()
    .from("cards")
    .select(
      "id, public_code, access_token, stamps_count, total_redemptions, claimed_milestones, status, customers(full_name, birth_month, deleted_at), programs(id, card_title, stamps_required, reward_description, design_version), businesses(id, name, slug, logo_url, card_background_url, primary_color, text_color, status, plan)",
    )
    .eq("access_token", accessToken)
    .maybeSingle<Row>();
  if (!data || data.customers.deleted_at) return null;
  const milestones = await getProgramMilestones(data.programs.id, data.businesses.plan, data.programs.stamps_required);

  return {
    id: data.id,
    publicCode: data.public_code,
    accessToken: data.access_token,
    stampsCount: data.stamps_count,
    totalRedemptions: data.total_redemptions,
    status: data.status,
    customerName: data.customers.full_name,
    needsBirthday: data.customers.birth_month === null,
    milestones: milestoneStatuses(milestones, data.stamps_count, data.claimed_milestones ?? []),
    program: {
      id: data.programs.id,
      cardTitle: data.programs.card_title,
      stampsRequired: data.programs.stamps_required,
      rewardDescription: data.programs.reward_description,
      designVersion: data.programs.design_version,
    },
    business: {
      id: data.businesses.id,
      name: data.businesses.name,
      slug: data.businesses.slug,
      logoUrl: data.businesses.logo_url,
      backgroundUrl: data.businesses.card_background_url,
      primaryColor: data.businesses.primary_color,
      textColor: data.businesses.text_color,
      status: data.businesses.status,
    },
  };
});
