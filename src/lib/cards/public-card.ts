import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";

export interface PublicCardView {
  id: string;
  publicCode: string;
  accessToken: string;
  stampsCount: number;
  totalRedemptions: number;
  status: "active" | "blocked";
  customerName: string;
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
  status: "active" | "blocked";
  customers: { full_name: string; deleted_at: string | null };
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
  };
}

/** Tarjeta por access_token (enlace personal). Solo lectura. */
export const getCardByAccessToken = cache(async (accessToken: string): Promise<PublicCardView | null> => {
  if (!/^[A-Za-z0-9_-]{32,80}$/.test(accessToken)) return null;
  const { data } = await createAdminClient()
    .from("cards")
    .select(
      "id, public_code, access_token, stamps_count, total_redemptions, status, customers(full_name, deleted_at), programs(id, card_title, stamps_required, reward_description, design_version), businesses(id, name, slug, logo_url, card_background_url, primary_color, text_color, status)",
    )
    .eq("access_token", accessToken)
    .maybeSingle<Row>();
  if (!data || data.customers.deleted_at) return null;

  return {
    id: data.id,
    publicCode: data.public_code,
    accessToken: data.access_token,
    stampsCount: data.stamps_count,
    totalRedemptions: data.total_redemptions,
    status: data.status,
    customerName: data.customers.full_name,
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
