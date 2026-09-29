import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { StampEventType } from "@/types/db";

export interface EventRow {
  id: string;
  type: StampEventType;
  delta: number;
  stamps_after: number;
  note: string | null;
  undone_at: string | null;
  created_at: string;
  card_id: string;
  customerId: string | null;
  customerName: string;
  performerName: string | null;
}

interface RawEvent {
  id: string;
  type: StampEventType;
  delta: number;
  stamps_after: number;
  note: string | null;
  undone_at: string | null;
  created_at: string;
  card_id: string;
  cards: { customer_id: string; customers: { full_name: string } | null } | null;
  performer: { full_name: string } | null;
}

const EVENT_SELECT =
  "id, type, delta, stamps_after, note, undone_at, created_at, card_id, cards(customer_id, customers(full_name)), performer:profiles!stamp_events_performed_by_fkey(full_name)";

export interface EventFilters {
  businessId: string;
  cardId?: string;
  type?: StampEventType;
  from?: Date;
  to?: Date;
  limit?: number;
}

/** Eventos de sellos con la sesión del staff (RLS limita al negocio). */
export async function listEvents(filters: EventFilters): Promise<EventRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("stamp_events")
    .select(EVENT_SELECT)
    .eq("business_id", filters.businessId)
    .order("created_at", { ascending: false })
    .limit(filters.limit ?? 100);
  if (filters.cardId) query = query.eq("card_id", filters.cardId);
  if (filters.type) query = query.eq("type", filters.type);
  if (filters.from) query = query.gte("created_at", filters.from.toISOString());
  if (filters.to) query = query.lt("created_at", filters.to.toISOString());

  const { data, error } = await query.returns<RawEvent[]>();
  if (error) {
    console.error("[panel] listEvents", error.message);
    return [];
  }
  return (data ?? []).map((e) => ({
    id: e.id,
    type: e.type,
    delta: e.delta,
    stamps_after: e.stamps_after,
    note: e.note,
    undone_at: e.undone_at,
    created_at: e.created_at,
    card_id: e.card_id,
    customerId: e.cards?.customer_id ?? null,
    customerName: e.cards?.customers?.full_name ?? "—",
    performerName: e.performer?.full_name ?? null,
  }));
}
