"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { inviteStaff } from "@/lib/staff-invite";
import { businessFieldsSchema, createBusinessSchema, ownerFieldsSchema, programFieldsSchema } from "@/lib/admin/schemas";
import { writeAudit } from "@/lib/audit";
import { getStaffContext } from "@/lib/auth/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureProgramEverywhere, syncProgramCards } from "@/lib/wallet";
import type { Business, Program } from "@/types/db";

export interface AdminFormState {
  error?: string;
  success?: string;
  manualLink?: string;
  createdId?: string;
}

async function requireSuperAdmin() {
  const ctx = await getStaffContext();
  if (!ctx || ctx.profile.role !== "super_admin") redirect("/login");
  return ctx;
}

function firstIssue(err: z.ZodError) {
  return err.issues[0]?.message ?? "Datos inválidos";
}

// ---------------------------------------------------------------------------
// Alta de negocio + programa + invitación al dueño
// ---------------------------------------------------------------------------
export async function createBusiness(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const ctx = await requireSuperAdmin();
  const parsed = createBusinessSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const d = parsed.data;
  const admin = createAdminClient();

  const { data: business, error: businessError } = await admin
    .from("businesses")
    .insert({
      name: d.name,
      slug: d.slug,
      primary_color: d.primary_color,
      text_color: d.text_color,
      default_country: d.default_country,
      timezone: d.timezone,
      contact_whatsapp: d.contact_whatsapp,
      status: d.status,
    })
    .select("id, name")
    .single<{ id: string; name: string }>();
  if (businessError || !business) {
    if (businessError?.code === "23505") return { error: `El slug "${d.slug}" ya está en uso. Elige otro.` };
    return { error: `No se pudo crear el negocio: ${businessError?.message ?? "error"}` };
  }

  const { data: program, error: programError } = await admin
    .from("programs")
    .insert({
      business_id: business.id,
      card_title: d.card_title,
      stamps_required: d.stamps_required,
      reward_description: d.reward_description,
      stamp_cooldown_minutes: d.stamp_cooldown_minutes,
      undo_window_minutes: d.undo_window_minutes,
    })
    .select("id")
    .single<{ id: string }>();
  if (programError || !program) {
    await admin.from("businesses").delete().eq("id", business.id);
    return { error: `No se pudo crear el programa: ${programError?.message ?? "error"}` };
  }

  await writeAudit({
    businessId: business.id,
    actorId: ctx.userId,
    action: "business.create",
    entityType: "business",
    entityId: business.id,
    metadata: { name: d.name, slug: d.slug, status: d.status },
  });
  await writeAudit({
    businessId: business.id,
    actorId: ctx.userId,
    action: "program.create",
    entityType: "program",
    entityId: program.id,
    metadata: { stamps_required: d.stamps_required, reward_description: d.reward_description },
  });

  const invite = await inviteStaff({
    email: d.owner_email,
    fullName: d.owner_name,
    role: "owner",
    businessId: business.id,
    businessName: business.name,
  });
  if (invite.ok) {
    await writeAudit({
      businessId: business.id,
      actorId: ctx.userId,
      action: "staff.invite",
      entityType: "profile",
      entityId: invite.userId,
      metadata: { role: "owner", email: d.owner_email, email_sent: invite.emailSent },
    });
  }

  after(() => ensureProgramEverywhere(program.id));
  revalidatePath("/admin/negocios");

  if (!invite.ok) {
    return {
      createdId: business.id,
      error: `Negocio creado, pero la invitación falló: ${invite.error}. Puedes reintentarla desde el detalle.`,
    };
  }
  return {
    createdId: business.id,
    success: invite.emailSent
      ? `Negocio creado. Enviamos la invitación a ${d.owner_email}.`
      : "Negocio creado. No hay email configurado: comparte este enlace con el dueño.",
    manualLink: invite.inviteUrl ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Edición del negocio
// ---------------------------------------------------------------------------
export async function updateBusiness(businessId: string, _prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const ctx = await requireSuperAdmin();
  const id = z.string().uuid().parse(businessId);
  const parsed = businessFieldsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const d = parsed.data;
  const admin = createAdminClient();

  const { data: before } = await admin.from("businesses").select("*").eq("id", id).maybeSingle<Business>();
  if (!before) return { error: "Negocio no encontrado" };

  const { error } = await admin.from("businesses").update(d).eq("id", id);
  if (error) {
    if (error.code === "23505") return { error: `El slug "${d.slug}" ya está en uso.` };
    return { error: `No se pudo guardar: ${error.message}` };
  }

  const changed = (Object.keys(d) as (keyof typeof d)[]).filter((k) => before[k] !== d[k]);
  if (before.status !== d.status && d.status === "suspended") {
    await writeAudit({ businessId: id, actorId: ctx.userId, action: "business.suspend", entityType: "business", entityId: id });
  }
  if (changed.length > 0) {
    await writeAudit({
      businessId: id,
      actorId: ctx.userId,
      action: "business.update",
      entityType: "business",
      entityId: id,
      metadata: { changed, status_from: before.status, status_to: d.status },
    });
  }

  // Cambios de marca afectan el diseño de las tarjetas en Wallet.
  const brandChanged = ["name", "primary_color", "text_color"].some((k) => changed.includes(k as keyof typeof d));
  if (brandChanged) await bumpDesignAndSync(id);

  revalidatePath(`/admin/negocios/${id}`);
  revalidatePath("/admin/negocios");
  return { success: changed.length > 0 ? "Cambios guardados" : "Sin cambios" };
}

async function bumpDesignAndSync(businessId: string) {
  const admin = createAdminClient();
  const { data: program } = await admin
    .from("programs")
    .select("id, design_version")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .maybeSingle<{ id: string; design_version: number }>();
  if (!program) return;
  await admin.from("programs").update({ design_version: program.design_version + 1 }).eq("id", program.id);
  after(() => syncProgramCards(program.id));
}

// ---------------------------------------------------------------------------
// Edición del programa
// ---------------------------------------------------------------------------
export async function updateProgram(programId: string, _prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const ctx = await requireSuperAdmin();
  const id = z.string().uuid().parse(programId);
  const parsed = programFieldsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const d = parsed.data;
  const admin = createAdminClient();

  const { data: before } = await admin.from("programs").select("*").eq("id", id).maybeSingle<Program>();
  if (!before) return { error: "Programa no encontrado" };

  const changed = (Object.keys(d) as (keyof typeof d)[]).filter((k) => before[k] !== d[k]);
  if (changed.length === 0) return { success: "Sin cambios" };

  const designChanged = ["card_title", "stamps_required", "reward_description"].some((k) =>
    changed.includes(k as keyof typeof d),
  );
  const { error } = await admin
    .from("programs")
    .update({ ...d, ...(designChanged ? { design_version: before.design_version + 1 } : {}) })
    .eq("id", id);
  if (error) return { error: `No se pudo guardar: ${error.message}` };

  await writeAudit({
    businessId: before.business_id,
    actorId: ctx.userId,
    action: "program.update",
    entityType: "program",
    entityId: id,
    metadata: { changed, before: Object.fromEntries(changed.map((k) => [k, before[k]])), after: Object.fromEntries(changed.map((k) => [k, d[k]])) },
  });

  if (designChanged) after(() => syncProgramCards(id));

  revalidatePath(`/admin/negocios/${before.business_id}`);
  return { success: "Programa actualizado" };
}

// ---------------------------------------------------------------------------
// Invitar otro dueño
// ---------------------------------------------------------------------------
export async function inviteOwner(businessId: string, _prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const ctx = await requireSuperAdmin();
  const id = z.string().uuid().parse(businessId);
  const parsed = ownerFieldsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const { data: business } = await createAdminClient()
    .from("businesses")
    .select("id, name")
    .eq("id", id)
    .maybeSingle<{ id: string; name: string }>();
  if (!business) return { error: "Negocio no encontrado" };

  const invite = await inviteStaff({
    email: parsed.data.owner_email,
    fullName: parsed.data.owner_name,
    role: "owner",
    businessId: id,
    businessName: business.name,
  });
  if (!invite.ok) return { error: invite.error };

  await writeAudit({
    businessId: id,
    actorId: ctx.userId,
    action: "staff.invite",
    entityType: "profile",
    entityId: invite.userId,
    metadata: { role: "owner", email: parsed.data.owner_email, email_sent: invite.emailSent },
  });
  revalidatePath(`/admin/negocios/${id}`);
  return {
    success: invite.emailSent ? `Invitación enviada a ${parsed.data.owner_email}` : "Usuario creado. Comparte este enlace:",
    manualLink: invite.inviteUrl ?? undefined,
  };
}
