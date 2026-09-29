"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/staff";
import { customerForOwner, deleteCustomerData } from "@/lib/customers/staff-actions";

export interface DeleteState {
  error?: string;
}

const schema = z.object({ customerId: z.string().uuid(), confirmName: z.string().trim() });

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
