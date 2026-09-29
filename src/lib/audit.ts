import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

interface AuditEntry {
  businessId: string | null;
  actorId: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  impersonating?: boolean;
}

/** Registra en audit_logs. Nunca incluir PIN ni tokens en metadata. */
export async function writeAudit(entry: AuditEntry): Promise<void> {
  const admin = createAdminClient();
  const metadata = { ...(entry.metadata ?? {}), ...(entry.impersonating ? { impersonating: true } : {}) };
  const { error } = await admin.from("audit_logs").insert({
    business_id: entry.businessId,
    actor_id: entry.actorId,
    action: entry.action,
    entity_type: entry.entityType ?? null,
    entity_id: entry.entityId ?? null,
    metadata,
  });
  if (error) console.error("[audit] no se pudo registrar", entry.action, error.message);
}
