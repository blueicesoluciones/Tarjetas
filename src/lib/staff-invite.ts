import "server-only";
import { appUrl, serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { StaffRole } from "@/types/db";

export interface InviteParams {
  email: string;
  fullName: string;
  role: Exclude<StaffRole, "super_admin">;
  businessId: string;
  businessName: string;
}

export type InviteResult =
  | { ok: true; userId: string; emailSent: boolean; inviteUrl: string | null }
  | { ok: false; error: string };

const ROLE_LABEL: Record<InviteParams["role"], string> = { owner: "dueño/a", cashier: "cajero/a" };

/**
 * Invita a un usuario de negocio: genera el enlace con auth.admin.generateLink,
 * crea su perfil y envía el email con Resend. Sin RESEND_API_KEY (desarrollo)
 * devuelve el enlace para compartirlo manualmente.
 */
export async function inviteStaff(params: InviteParams): Promise<InviteResult> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "invite",
    email: params.email,
    options: { data: { full_name: params.fullName }, redirectTo: appUrl("/auth/definir-clave") },
  });
  if (error || !data.user) {
    const exists = /already|registered|exists/i.test(error?.message ?? "");
    return {
      ok: false,
      error: exists
        ? "Ya existe un usuario con ese email. Si pertenece a otro negocio no puede agregarse aquí."
        : "No se pudo crear la invitación",
    };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: data.user.id,
    full_name: params.fullName,
    role: params.role,
    business_id: params.businessId,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { ok: false, error: "No se pudo crear el perfil del usuario" };
  }

  const inviteUrl = appUrl(`/auth/confirm?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=invite`);
  const emailSent = await sendInviteEmail(params, inviteUrl);
  return { ok: true, userId: data.user.id, emailSent, inviteUrl: emailSent ? null : inviteUrl };
}

async function sendInviteEmail(params: InviteParams, inviteUrl: string): Promise<boolean> {
  const env = serverEnv();
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) return false;

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto">
      <h2>Hola, ${escapeHtml(params.fullName)}</h2>
      <p>Te invitaron como <strong>${ROLE_LABEL[params.role]}</strong> de <strong>${escapeHtml(params.businessName)}</strong> en la plataforma de tarjetas de sellos.</p>
      <p><a href="${inviteUrl}" style="display:inline-block;background:#111827;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Aceptar invitación</a></p>
      <p style="color:#6b7280;font-size:13px">Si no esperabas este correo, puedes ignorarlo.</p>
    </div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: params.email,
        subject: `Invitación a ${params.businessName}`,
        html,
      }),
    });
    if (!res.ok) console.error("[invite] resend", res.status, await res.text());
    return res.ok;
  } catch (err) {
    console.error("[invite] resend", err instanceof Error ? err.message : err);
    return false;
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
