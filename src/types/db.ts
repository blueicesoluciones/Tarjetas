/**
 * Tipos de filas de la base de datos (espejo de supabase/migrations).
 * TODO: reemplazar por tipos generados con `npm run db:types` cuando haya
 * un proyecto de Supabase enlazado.
 */
export type StaffRole = "super_admin" | "owner" | "cashier";
export type BusinessStatus = "trial" | "active" | "suspended";
export type CardStatus = "active" | "blocked";
export type StampEventType = "stamp" | "manual_adjust" | "redeem" | "undo";

export interface Business {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  text_color: string;
  default_country: string;
  timezone: string;
  contact_whatsapp: string | null;
  status: BusinessStatus;
  created_at: string;
  updated_at: string;
}

export interface Program {
  id: string;
  business_id: string;
  card_title: string;
  stamps_required: number;
  reward_description: string;
  stamp_cooldown_minutes: number;
  undo_window_minutes: number;
  is_active: boolean;
  google_class_id: string | null;
  design_version: number;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  role: StaffRole;
  business_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Customer {
  id: string;
  business_id: string;
  full_name: string;
  phone_e164: string;
  email: string | null;
  pin_hash: string;
  pin_must_change: boolean;
  pin_temp_expires_at: string | null;
  pin_failed_attempts: number;
  pin_locked_until: string | null;
  pin_lockout_count: number;
  marketing_consent: boolean;
  privacy_accepted_at: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Card {
  id: string;
  business_id: string;
  program_id: string;
  customer_id: string;
  public_code: string;
  access_token: string;
  stamps_count: number;
  total_stamps: number;
  total_redemptions: number;
  last_stamp_at: string | null;
  status: CardStatus;
  google_object_id: string | null;
  google_saved: boolean;
  apple_serial_number: string | null;
  apple_auth_token: string | null;
  wallet_sync_error: string | null;
  wallet_synced_at: string | null;
  updated_at: string;
  created_at: string;
}

export interface StampEvent {
  id: string;
  business_id: string;
  card_id: string;
  type: StampEventType;
  delta: number;
  stamps_after: number;
  performed_by: string | null;
  note: string | null;
  undone_at: string | null;
  undone_by: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  business_id: string | null;
  actor_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/** Estado devuelto por las funciones add_stamp, redeem_reward, etc. */
export interface CardState {
  card_id: string;
  business_id: string;
  public_code: string;
  customer_id: string;
  customer_name: string;
  stamps_count: number;
  stamps_required: number;
  reward_description: string;
  reward_available: boolean;
  total_stamps: number;
  total_redemptions: number;
  last_stamp_at: string | null;
  card_status: CardStatus;
  business_status: BusinessStatus;
  business_name: string;
  stamp_cooldown_minutes: number;
  undo_window_minutes: number;
  event_id?: string;
  undoable_event?: { event_id: string; created_at: string } | null;
}

export interface CustomerSearchResult {
  card_id: string;
  public_code: string;
  customer_name: string;
  phone_e164: string;
  stamps_count: number;
  stamps_required: number;
}
