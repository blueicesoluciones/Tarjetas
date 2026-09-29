"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { businessFieldsSchema, createBusinessSchema, programFieldsSchema } from "@/lib/admin/schemas";
import { writeAudit } from "@/lib/audit";
import { getStaffContext } from "@/lib/auth/staff";
import { createStaffUser, setStaffPassword, staffPasswordSchema, staffUserSchema } from "@/lib/staff-users";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureProgramEverywhere, syncProgramCards } from "@/lib/wallet";
import type { Business, Program } from "@/types/db";

export interface AdminFormState {
  error?: string;
  success?: string;
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
// Alta de negocio + programa + usuario dueño
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

  const owner = await createStaffUser({
    full_name: d.owner_name,
    email: d.owner_email,
    password: d.owner_password,
    role: "owner",
    businessId: business.id,
  });
  if (owner.ok) {
    await writeAudit({
      businessId: business.id,
      actorId: ctx.userId,
      action: "staff.create",
      entityType: "profile",
      entityId: owner.userId,
      metadata: { role: "owner", email: d.owner_email },
    });
  }

  after(() => ensureProgramEverywhere(program.id));
  revalidatePath("/admin/negocios");

  if (!owner.ok) {
    return {
      createdId: business.id,
      error: `Negocio creado, pero no se pudo crear el dueño: ${owner.error}. Puedes crearlo desde el detalle.`,
    };
  }
  return {
    createdId: business.id,
    success: `Negocio creado. El dueño ya puede ingresar en /login con ${d.owner_email} y la contraseña que definiste.`,
  };
}

// ---------------------------------------------------------------------------
// Edición del negocio
// ---------------------------------------------------------------------------
export async function updateBusiness(businessId: string, _prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const ctx = await requireSuperAdmin();
  const id = z.guid().parse(businessId);
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
  const id = z.guid().parse(programId);
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
// Usuarios del negocio (dueños y cajeros)
// ---------------------------------------------------------------------------
export async function createBusinessUser(businessId: string, _prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const ctx = await requireSuperAdmin();
  const id = z.guid().parse(businessId);
  const parsed = staffUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const { data: business } = await createAdminClient().from("businesses").select("id").eq("id", id).maybeSingle();
  if (!business) return { error: "Negocio no encontrado" };

  const result = await createStaffUser({ ...parsed.data, businessId: id });
  if (!result.ok) return { error: result.error };

  await writeAudit({
    businessId: id,
    actorId: ctx.userId,
    action: "staff.create",
    entityType: "profile",
    entityId: result.userId,
    metadata: { role: parsed.data.role, email: parsed.data.email },
  });
  revalidatePath(`/admin/negocios/${id}`);
  return { success: `Usuario creado. Puede ingresar en /login con ${parsed.data.email}.` };
}

const passwordFormSchema = z.object({ userId: z.guid(), password: staffPasswordSchema });

export async function changeUserPassword(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const ctx = await requireSuperAdmin();
  const parsed = passwordFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const { data: profile } = await createAdminClient()
    .from("profiles")
    .select("id, business_id, role")
    .eq("id", parsed.data.userId)
    .maybeSingle<{ id: string; business_id: string | null; role: string }>();
  if (!profile || profile.role === "super_admin") return { error: "Usuario no encontrado" };

  const error = await setStaffPassword(profile.id, parsed.data.password);
  if (error) return { error: `No se pudo cambiar la contraseña: ${error}` };

  await writeAudit({
    businessId: profile.business_id,
    actorId: ctx.userId,
    action: "staff.password_reset",
    entityType: "profile",
    entityId: profile.id,
  });
  return { success: "Contraseña actualizada" };
}

const activeSchema = z.object({ userId: z.guid(), active: z.enum(["true", "false"]) });

export async function setUserActive(formData: FormData): Promise<void> {
  const ctx = await requireSuperAdmin();
  const parsed = activeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const active = parsed.data.active === "true";
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .update({ is_active: active })
    .eq("id", parsed.data.userId)
    .neq("role", "super_admin")
    .select("business_id")
    .maybeSingle<{ business_id: string }>();
  if (!profile) return;

  await writeAudit({
    businessId: profile.business_id,
    actorId: ctx.userId,
    action: active ? "staff.activate" : "staff.deactivate",
    entityType: "profile",
    entityId: parsed.data.userId,
  });
  revalidatePath(`/admin/negocios/${profile.business_id}`);
}
