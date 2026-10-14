import "server-only";
import { planFeatures, type Plan } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Milestone } from "./rewards";

/** Premios intermedios del programa, solo si el plan los incluye. */
export async function getProgramMilestones(programId: string, plan: Plan, stampsRequired: number): Promise<Milestone[]> {
  if (!planFeatures(plan).milestoneRewards) return [];
  const { data } = await createAdminClient()
    .from("program_rewards")
    .select("stamps_at, description")
    .eq("program_id", programId)
    .lt("stamps_at", stampsRequired)
    .order("stamps_at")
    .returns<{ stamps_at: number; description: string }[]>();
  return (data ?? []).map((r) => ({ stampsAt: r.stamps_at, description: r.description }));
}
