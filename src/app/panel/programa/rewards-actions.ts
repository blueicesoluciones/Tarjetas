"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { writeAudit } from "@/lib/audit";
import { getBusinessWithProgram } from "@/lib/auth/business";
import { requireStaff } from "@/lib/auth/staff";
import { planFeatures } from "@/lib/plans";
import { validateMilestones } from "@/lib/rewards";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncProgramCards } from "@/lib/wallet";

export interface RewardsFormState {
  error?: string;
  success?: string;
}

const listSchema = z
  .array(
    z.object({
      stampsAt: z.coerce.number().int(),
      description: z.string().trim().max(80, "Máximo 80 caracteres por premio"),
    }),
  )
  .max(10);

export async function saveRewards(_prev: RewardsFormState, formData: FormData): Promise<RewardsFormState> {
  const ctx = await requireStaff(["owner"], { needsBusiness: true });

  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("rewards") ?? "[]"));
  } catch {
    return { error: "Datos inválidos" };
  }
  const parsed = listSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const { business, program } = await getBusinessWithProgram(ctx.businessId!);
  if (!business || !program) return { error: "Programa no encontrado" };
  if (!planFeatures(business.plan).milestoneRewards) {
    return { error: "Los premios intermedios están disponibles desde el plan Medium" };
  }

  const list = parsed.data.sort((a, b) => a.stampsAt - b.stampsAt);
  const invalid = validateMilestones(list, program.stamps_required);
  if (invalid) return { error: invalid };

  const admin = createAdminClient();
  const { error: delError } = await admin.from("program_rewards").delete().eq("program_id", program.id);
  if (delError) return { error: "No se pudo guardar" };
  if (list.length > 0) {
    const { error } = await admin.from("program_rewards").insert(
      list.map((m) => ({ business_id: business.id, program_id: program.id, stamps_at: m.stampsAt, description: m.description })),
    );
    if (error) {
      console.error("[panel] program_rewards.insert", error.message);
      return { error: "No se pudo guardar" };
    }
  }
  // Los círculos con regalo cambian: nueva versión de la imagen y sincronizar Wallet.
  await admin.from("programs").update({ design_version: program.design_version + 1 }).eq("id", program.id);

  await writeAudit({
    businessId: business.id,
    actorId: ctx.userId,
    action: "program.rewards_update",
    entityType: "program",
    entityId: program.id,
    metadata: { milestones: list.map((m) => m.stampsAt) },
    impersonating: ctx.impersonating,
  });
  after(() => syncProgramCards(program.id));

  revalidatePath("/panel/programa");
  return { success: list.length > 0 ? "Premios guardados" : "Premios intermedios eliminados" };
}
