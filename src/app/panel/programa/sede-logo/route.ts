import { staffForApi } from "@/lib/auth/staff";
import { removeBranchLogo, uploadBranchLogo } from "@/lib/cards/branch-logo-upload";
import { jsonError } from "@/lib/http/json";

/** Logo de una sede del propio negocio (dueño, plan Pro; o super admin en «ver como»). */
export async function POST(request: Request) {
  const ctx = await staffForApi(["owner"]);
  if (!ctx?.businessId) return jsonError("No autorizado", 403);
  return uploadBranchLogo(ctx, request, ctx.businessId);
}

export async function DELETE(request: Request) {
  const ctx = await staffForApi(["owner"]);
  if (!ctx?.businessId) return jsonError("No autorizado", 403);
  return removeBranchLogo(ctx, request, ctx.businessId);
}
