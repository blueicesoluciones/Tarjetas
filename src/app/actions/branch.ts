"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { getStaffContext } from "@/lib/auth/staff";
import { PANEL_BRANCH_COOKIE, SCANNER_BRANCH_COOKIE } from "@/lib/branches";

const valueSchema = z.union([z.literal(""), z.guid()]);

/** Guarda la sede elegida (la valida cada página contra las del negocio). */
async function setBranchCookie(name: string, formData: FormData) {
  const ctx = await getStaffContext();
  if (!ctx || ctx.profile.role === "cashier") return;
  const parsed = valueSchema.safeParse(String(formData.get("branchId") ?? ""));
  if (!parsed.success) return;
  const store = await cookies();
  if (!parsed.data) store.delete(name);
  else {
    store.set(name, parsed.data, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
}

export async function setPanelBranch(formData: FormData) {
  await setBranchCookie(PANEL_BRANCH_COOKIE, formData);
  revalidatePath("/panel", "layout");
}

export async function setScannerBranch(formData: FormData) {
  await setBranchCookie(SCANNER_BRANCH_COOKIE, formData);
  revalidatePath("/escaner", "layout");
}
