import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { deliverWalletMessage } from "@/lib/campaigns";
import { defaultWinbackMessage, needsWinback } from "@/lib/winback";

interface ProgramRow {
  id: string;
  business_id: string;
  winback_days: number;
  winback_message: string | null;
  businesses: { name: string; plan: string; status: string };
}

interface CardRow {
  id: string;
  google_object_id: string | null;
  apple_serial_number: string | null;
  last_stamp_at: string;
  winback_sent_at: string | null;
}

/** Proceso diario: envía «Te extrañamos» en los negocios Pro que lo activaron. */
export async function runWinback(now = new Date()) {
  const admin = createAdminClient();
  const { data: programs } = await admin
    .from("programs")
    .select("id, business_id, winback_days, winback_message, businesses!inner(name, plan, status)")
    .eq("is_active", true)
    .not("winback_days", "is", null)
    .eq("businesses.plan", "pro")
    .neq("businesses.status", "suspended")
    .returns<ProgramRow[]>();

  const summary: { business: string; sent: number; failed: number }[] = [];
  for (const program of programs ?? []) {
    const cutoff = new Date(now.getTime() - program.winback_days * 86_400_000).toISOString();
    const { data: cards } = await admin
      .from("cards")
      .select("id, google_object_id, apple_serial_number, last_stamp_at, winback_sent_at, customers!inner(marketing_consent, deleted_at)")
      .eq("program_id", program.id)
      .eq("status", "active")
      .or("google_object_id.not.is.null,apple_serial_number.not.is.null")
      .lt("last_stamp_at", cutoff)
      .eq("customers.marketing_consent", true)
      .is("customers.deleted_at", null)
      .limit(1000)
      .returns<CardRow[]>();

    const due = (cards ?? []).filter((c) => needsWinback(c, program.winback_days, now));
    if (due.length === 0) continue;

    const message = program.winback_message ?? defaultWinbackMessage(program.businesses.name);
    const { sent, failed } = await deliverWalletMessage(
      due.map((c) => ({ cardId: c.id, objectId: c.google_object_id, appleSerial: c.apple_serial_number })),
      program.businesses.name,
      message,
    );
    await admin
      .from("cards")
      .update({ winback_sent_at: now.toISOString() })
      .in("id", due.map((c) => c.id));
    summary.push({ business: program.businesses.name, sent, failed });
  }
  return summary;
}
