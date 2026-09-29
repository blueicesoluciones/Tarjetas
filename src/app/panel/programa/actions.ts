"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { writeAudit } from "@/lib/audit";
import { getBusinessWithProgram } from "@/lib/auth/business";
import { requireStaff } from "@/lib/auth/staff";
import { normalizePhone } from "@/lib/domain/phone";
import { programFormSchema } from "@/lib/panel/program-schema";
import { createClient } from "@/lib/supabase/server";
import { syncProgramCards } from "@/lib/wallet";

export interface ProgramFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
}

export async function saveProgram(_prev: ProgramFormState, formData: FormData): Promise<ProgramFormState> {
  const ctx = await requireStaff(["owner"], { needsBusiness: true });
  const parsed = programFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { error: "Revisa los campos marcados", fieldErrors };
  }
  const v = parsed.data;

  const { business, program } = await getBusinessWithProgram(ctx.businessId!);
  if (!business || !program) return { error: "Negocio sin programa activo" };

  let whatsapp: string | null = null;
  if (v.contactWhatsapp) {
    whatsapp = normalizePhone(v.contactWhatsapp, v.defaultCountry);
    if (!whatsapp) return { error: "Revisa los campos marcados", fieldErrors: { contactWhatsapp: "Teléfono inválido" } };
  }

  const businessPatch = {
    name: v.businessName,
    primary_color: v.primaryColor.toUpperCase(),
    text_color: v.textColor.toUpperCase(),
    contact_whatsapp: whatsapp,
    default_country: v.defaultCountry,
    timezone: v.timezone,
  };
  const programPatch = {
    card_title: v.cardTitle,
    stamps_required: v.stampsRequired,
    reward_description: v.rewardDescription,
    stamp_cooldown_minutes: v.stampCooldownMinutes,
    undo_window_minutes: v.undoWindowMinutes,
  };

  const visualChanged =
    business.name !== businessPatch.name ||
    business.primary_color.toUpperCase() !== businessPatch.primary_color ||
    business.text_color.toUpperCase() !== businessPatch.text_color ||
    program.card_title !== programPatch.card_title ||
    program.stamps_required !== programPatch.stamps_required ||
    program.reward_description !== programPatch.reward_description;

  const businessChanged = (Object.keys(businessPatch) as Array<keyof typeof businessPatch>).filter(
    (k) => String(business[k] ?? "") !== String(businessPatch[k] ?? ""),
  );
  const programChanged = (Object.keys(programPatch) as Array<keyof typeof programPatch>).filter(
    (k) => String(program[k]) !== String(programPatch[k]),
  );

  if (businessChanged.length === 0 && programChanged.length === 0) return { success: true };

  const supabase = await createClient();
  if (businessChanged.length > 0) {
    const { error } = await supabase.from("businesses").update(businessPatch).eq("id", business.id);
    if (error) {
      console.error("[panel] business.update", error.message);
      return { error: "No se pudo guardar el negocio" };
    }
    await writeAudit({
      businessId: business.id,
      actorId: ctx.userId,
      action: "business.update",
      entityType: "business",
      entityId: business.id,
      metadata: { fields: businessChanged },
      impersonating: ctx.impersonating,
    });
  }

  if (programChanged.length > 0 || visualChanged) {
    const { error } = await supabase
      .from("programs")
      .update({ ...programPatch, design_version: visualChanged ? program.design_version + 1 : program.design_version })
      .eq("id", program.id);
    if (error) {
      console.error("[panel] program.update", error.message);
      return { error: "No se pudo guardar el programa" };
    }
    await writeAudit({
      businessId: business.id,
      actorId: ctx.userId,
      action: "program.update",
      entityType: "program",
      entityId: program.id,
      metadata: { fields: programChanged, design_version_bumped: visualChanged },
      impersonating: ctx.impersonating,
    });
  }

  if (visualChanged) after(() => syncProgramCards(program.id));

  revalidatePath("/panel", "layout");
  return { success: true };
}
