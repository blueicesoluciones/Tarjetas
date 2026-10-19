"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/staff";
import { customerForOwner, deleteCustomerData, updateCustomerBirthday } from "@/lib/customers/staff-actions";
import { birthdaySchema } from "@/lib/domain/birthday";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncCardEverywhere } from "@/lib/wallet";

export interface DeleteState {
  error?: string;
}

const schema = z.object({ customerId: z.guid(), confirmName: z.string().trim() });

export async function deleteCustomerAction(_prev: DeleteState, formData: FormData): Promise<DeleteState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Datos inválidos" };

  const ctx = await requireStaff(["owner"], { needsBusiness: true });
  const customer = await customerForOwner(ctx, parsed.data.customerId);
  if (!customer) return { error: "Cliente no encontrado" };
  if (parsed.data.confirmName.toLocaleLowerCase("es") !== customer.full_name.trim().toLocaleLowerCase("es")) {
    return { error: "El nombre no coincide" };
  }

  try {
    await deleteCustomerData(ctx, customer.id);
  } catch (err) {
    console.error("[panel] deleteCustomer", err instanceof Error ? err.message : err);
    return { error: "No se pudo eliminar, intenta de nuevo" };
  }
  redirect("/panel/clientes");
}

export interface BirthdayEditState {
  error?: string;
  success?: string;
}

export async function updateBirthdayAction(customerId: string, _prev: BirthdayEditState, formData: FormData): Promise<BirthdayEditState> {
  const parsed = birthdaySchema.safeParse({ birthMonth: formData.get("birthMonth"), birthDay: formData.get("birthDay") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa la fecha" };
  const ctx = await requireStaff(["owner"], { needsBusiness: true });
  try {
    const result = await updateCustomerBirthday(ctx, customerId, parsed.data.birthMonth, parsed.data.birthDay);
    if (!result) return { error: "Cliente no encontrado" };
  } catch (err) {
    console.error("[panel] birthday", err instanceof Error ? err.message : err);
    return { error: "No se pudo guardar, intenta de nuevo" };
  }
  // El pase de Wallet deja de pedir la actualización.
  const { data: cards } = await createAdminClient().from("cards").select("id").eq("customer_id", customerId);
  after(() => Promise.all((cards ?? []).map((c: { id: string }) => syncCardEverywhere(c.id))));
  revalidatePath(`/panel/clientes/${customerId}`);
  revalidatePath("/panel");
  return { success: "Cumpleaños guardado" };
}
