import { staffForApi } from "@/lib/auth/staff";
import { removeBranchLogo, uploadBranchLogo } from "@/lib/cards/branch-logo-upload";
import { jsonError } from "@/lib/http/json";

/** Logo de una sede de cualquier negocio (solo super admin). */
export async function POST(request: Request) {
  const ctx = await staffForApi([]);
  if (!ctx) return jsonError("No autorizado", 403);
  return uploadBranchLogo(ctx, request);
}

export async function DELETE(request: Request) {
  const ctx = await staffForApi([]);
  if (!ctx) return jsonError("No autorizado", 403);
  return removeBranchLogo(ctx, request);
}
