"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { writeAudit } from "@/lib/audit";
import { getStaffContext } from "@/lib/auth/staff";
import { planFeatures, type Plan } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";

/** Sedes de un negocio (multisede, plan Pro). Solo el super admin las gestiona. */

export interface BranchFormState {
  error?: string;
  success?: string;
}

async function requireSuperAdmin() {
  const ctx = await getStaffContext();
  if (!ctx || ctx.profile.role !== "super_admin") redirect("/login");
  return ctx;
}

const branchSchema = z.object({
  name: z.string().trim().min(1, "Escribe el nombre de la sede").max(60, "Máximo 60 caracteres"),
  address: z
    .string()
    .trim()
    .max(120, "Máximo 120 caracteres")
    .transform((v) => v || null),
});

function revalidate(businessId: string) {
  revalidatePath(`/admin/negocios/${businessId}`);
  revalidatePath("/panel", "layout");
  revalidatePath("/escaner", "layout");
}

export async function createBranch(businessId: string, _prev: BranchFormState, formData: FormData): Promise<BranchFormState> {
  const ctx = await requireSuperAdmin();
  const id = z.guid().parse(businessId);
  const parsed = branchSchema.safeParse({ name: formData.get("name") ?? "", address: formData.get("address") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const admin = createAdminClient();
  const { data: business } = await admin.from("businesses").select("plan").eq("id", id).maybeSingle<{ plan: Plan }>();
  if (!business) return { error: "Negocio no encontrado" };
  if (!planFeatures(business.plan).multiBranch) return { error: "Varias sedes está disponible en el plan Pro." };

  const { data: branch, error } = await admin
    .from("branches")
    .insert({ business_id: id, name: parsed.data.name, address: parsed.data.address })
    .select("id")
    .single<{ id: string }>();
  if (error || !branch) {
    if (error?.code === "23505") return { error: `Ya existe una sede llamada «${parsed.data.name}».` };
    return { error: `No se pudo crear la sede: ${error?.message ?? "error"}` };
  }
  await writeAudit({
    businessId: id,
    actorId: ctx.userId,
    action: "branch.create",
    entityType: "branch",
    entityId: branch.id,
    metadata: { name: parsed.data.name },
  });
  revalidate(id);
  return { success: `Sede «${parsed.data.name}» creada. Ya puedes asignarle cajeros.` };
}

export async function updateBranch(branchId: string, _prev: BranchFormState, formData: FormData): Promise<BranchFormState> {
  const ctx = await requireSuperAdmin();
  const id = z.guid().parse(branchId);
  const parsed = branchSchema.safeParse({ name: formData.get("name") ?? "", address: formData.get("address") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const { data: branch, error } = await createAdminClient()
    .from("branches")
    .update({ name: parsed.data.name, address: parsed.data.address })
    .eq("id", id)
    .select("business_id")
    .single<{ business_id: string }>();
  if (error || !branch) {
    if (error?.code === "23505") return { error: `Ya existe una sede llamada «${parsed.data.name}».` };
    return { error: "No se pudo guardar la sede" };
  }
  await writeAudit({
    businessId: branch.business_id,
    actorId: ctx.userId,
    action: "branch.update",
    entityType: "branch",
    entityId: id,
    metadata: { name: parsed.data.name },
  });
  revalidate(branch.business_id);
  return { success: "Sede guardada" };
}

/** Desactivar en vez de borrar: el historial conserva la sede de cada sello. */
export async function setBranchActive(formData: FormData): Promise<void> {
  const ctx = await requireSuperAdmin();
  const parsed = z
    .object({ branchId: z.guid(), active: z.enum(["true", "false"]) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const active = parsed.data.active === "true";
  const { data: branch } = await createAdminClient()
    .from("branches")
    .update({ is_active: active })
    .eq("id", parsed.data.branchId)
    .select("business_id, name")
    .single<{ business_id: string; name: string }>();
  if (!branch) return;
  await writeAudit({
    businessId: branch.business_id,
    actorId: ctx.userId,
    action: active ? "branch.activate" : "branch.deactivate",
    entityType: "branch",
    entityId: parsed.data.branchId,
    metadata: { name: branch.name },
  });
  revalidate(branch.business_id);
}

/** Asigna (o quita) la sede de un cajero. */
export async function assignCashierBranch(formData: FormData): Promise<void> {
  const ctx = await requireSuperAdmin();
  const parsed = z
    .object({ userId: z.guid(), branchId: z.union([z.literal(""), z.guid()]) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, role, business_id")
    .eq("id", parsed.data.userId)
    .maybeSingle<{ id: string; role: string; business_id: string | null }>();
  if (!profile || profile.role !== "cashier" || !profile.business_id) return;

  const branchId = parsed.data.branchId || null;
  if (branchId) {
    const { data: branch } = await admin
      .from("branches")
      .select("id")
      .eq("id", branchId)
      .eq("business_id", profile.business_id)
      .maybeSingle();
    if (!branch) return;
  }
  await admin.from("profiles").update({ branch_id: branchId }).eq("id", profile.id);
  await writeAudit({
    businessId: profile.business_id,
    actorId: ctx.userId,
    action: "staff.branch",
    entityType: "profile",
    entityId: profile.id,
    metadata: { branch_id: branchId },
  });
  revalidate(profile.business_id);
}
