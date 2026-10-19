"use server";

import { revalidatePath } from "next/cache";
import { saveBirthdayFromCard } from "@/lib/customers/service";
import { birthdaySchema } from "@/lib/domain/birthday";
import { clientIp } from "@/lib/request";

export interface BirthdayState {
  error?: string;
  saved?: boolean;
}

export async function saveBirthday(accessToken: string, _prev: BirthdayState, formData: FormData): Promise<BirthdayState> {
  const parsed = birthdaySchema.safeParse({ birthMonth: formData.get("birthMonth"), birthDay: formData.get("birthDay") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa la fecha" };
  const result = await saveBirthdayFromCard(accessToken, parsed.data, await clientIp());
  if (!result.ok) return { error: result.error };
  revalidatePath(`/t/${accessToken}`);
  return { saved: true };
}
