"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { writeAudit } from "@/lib/audit";
import { RESYNC_ALL_ACTION } from "@/lib/domains";
import { getStaffContext } from "@/lib/auth/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncProgramCards } from "@/lib/wallet";

export interface ResyncState {
  error?: string;
  success?: string;
}

const MIN_MINUTES_BETWEEN = 10;

/**
 * Vuelve a enviar todas las tarjetas a Google Wallet y Apple Wallet. Cada pase
 * nuevo sale con la dirección actual, así los iPhone dejan la dirección vieja.
 */
export async function resyncAllWalletCardsAction(): Promise<ResyncState> {
  const ctx = await getStaffContext();
  if (!ctx || ctx.profile.role !== "super_admin") redirect("/login");
  const admin = createAdminClient();

  const since = new Date(Date.now() - MIN_MINUTES_BETWEEN * 60_000).toISOString();
  const { count: recent } = await admin
    .from("audit_logs")
    .select("id", { count: "exact", head: true })
    .eq("action", RESYNC_ALL_ACTION)
    .gte("created_at", since);
  if ((recent ?? 0) > 0) return { error: `Ya se actualizaron hace menos de ${MIN_MINUTES_BETWEEN} minutos.` };

  const { data: programs } = await admin
    .from("programs")
    .select("id")
    .eq("is_active", true)
    .returns<{ id: string }[]>();
  const ids = (programs ?? []).map((p) => p.id);
  await writeAudit({
    businessId: null,
    actorId: ctx.userId,
    action: RESYNC_ALL_ACTION,
    metadata: { programs: ids.length },
  });

  after(async () => {
    for (const id of ids) await syncProgramCards(id);
  });
  revalidatePath("/admin");
  return {
    success:
      "Actualizando todas las tarjetas. Los iPhone se pasan solos a la dirección nueva en los próximos minutos.",
  };
}
