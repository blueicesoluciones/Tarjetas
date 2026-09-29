"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { writeAudit } from "@/lib/audit";
import { ACTING_BUSINESS_COOKIE, getStaffContext } from "@/lib/auth/staff";
import { createAdminClient } from "@/lib/supabase/admin";

export async function startImpersonation(businessId: string) {
  const id = z.string().uuid().parse(businessId);
  const ctx = await getStaffContext();
  if (!ctx || ctx.profile.role !== "super_admin") redirect("/login");

  const admin = createAdminClient();
  const { data: business } = await admin.from("businesses").select("id, name").eq("id", id).maybeSingle();
  if (!business) redirect("/admin/negocios");

  (await cookies()).set(ACTING_BUSINESS_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  await writeAudit({
    businessId: id,
    actorId: ctx.userId,
    action: "impersonation.start",
    entityType: "business",
    entityId: id,
    impersonating: true,
  });
  redirect("/panel");
}

export async function stopImpersonation() {
  const ctx = await getStaffContext();
  const store = await cookies();
  const acting = store.get(ACTING_BUSINESS_COOKIE)?.value;
  store.delete(ACTING_BUSINESS_COOKIE);
  if (ctx && acting) {
    await writeAudit({
      businessId: acting,
      actorId: ctx.userId,
      action: "impersonation.stop",
      entityType: "business",
      entityId: acting,
      impersonating: true,
    });
  }
  redirect(acting ? `/admin/negocios/${acting}` : "/admin");
}
