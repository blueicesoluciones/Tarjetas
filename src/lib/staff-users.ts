import "server-only";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import type { StaffRole } from "@/types/db";

/**
 * Los usuarios de negocio (dueños y cajeros) los crea el super admin con email y
 * contraseña. No se envían correos: el super admin entrega las credenciales.
 */
export const staffPasswordSchema = z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(72);

export const staffUserSchema = z.object({
  full_name: z.string().trim().min(2, "Ingresa el nombre").max(80),
  email: z.string().trim().toLowerCase().email("Email inválido"),
  password: staffPasswordSchema,
  role: z.enum(["owner", "cashier"]),
});

export type StaffUserInput = z.output<typeof staffUserSchema> & { businessId: string };

export type StaffUserResult = { ok: true; userId: string } | { ok: false; error: string };

export async function createStaffUser(input: StaffUserInput): Promise<StaffUserResult> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.full_name },
  });
  if (error || !data.user) {
    const exists = /already|registered|exists/i.test(error?.message ?? "");
    return { ok: false, error: exists ? "Ya existe un usuario con ese email" : `No se pudo crear el usuario: ${error?.message}` };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: data.user.id,
    full_name: input.full_name,
    role: input.role satisfies Exclude<StaffRole, "super_admin">,
    business_id: input.businessId,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { ok: false, error: `No se pudo crear el perfil: ${profileError.message}` };
  }
  return { ok: true, userId: data.user.id };
}

export async function setStaffPassword(userId: string, password: string): Promise<string | null> {
  const { error } = await createAdminClient().auth.admin.updateUserById(userId, { password });
  return error ? error.message : null;
}
