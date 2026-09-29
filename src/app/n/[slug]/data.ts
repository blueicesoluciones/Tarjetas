import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getBusinessBySlug } from "@/lib/customers/service";

export const loadPublicBusiness = cache(async (slug: string) => {
  const { business, program } = await getBusinessBySlug(slug);
  if (!business || !program) notFound();
  return { business, program };
});
