import Link from "next/link";
import { Cake, MessageCircle } from "lucide-react";
import { birthdaysOn } from "@/lib/domain/birthday";
import { formatPhone } from "@/lib/domain/phone";
import { localDateString } from "@/lib/panel/format";
import { createAdminClient } from "@/lib/supabase/admin";

interface Row {
  id: string;
  full_name: string;
  phone_e164: string;
}

/** Clientes que cumplen años hoy (zona horaria del negocio). No se muestra si no hay. */
export async function BirthdaysToday({ businessId, timeZone }: { businessId: string; timeZone: string }) {
  const dates = birthdaysOn(localDateString(new Date(), timeZone));
  const { data } = await createAdminClient()
    .from("customers")
    .select("id, full_name, phone_e164")
    .eq("business_id", businessId)
    .is("deleted_at", null)
    .eq("birth_month", dates[0].month)
    .in(
      "birth_day",
      dates.map((d) => d.day),
    )
    .order("full_name")
    .limit(50)
    .returns<Row[]>();
  const people = data ?? [];
  if (people.length === 0) return null;

  return (
    <section className="mb-6 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-amber-950" aria-labelledby="birthdays-today">
      <h2 id="birthdays-today" className="flex items-center gap-2 font-semibold">
        <Cake className="size-5" aria-hidden />
        {people.length === 1 ? "Hoy cumple años 1 cliente" : `Hoy cumplen años ${people.length} clientes`}
      </h2>
      <p className="mt-0.5 text-sm text-amber-900/80">Salúdalos o dales un detalle cuando vengan.</p>
      <ul className="mt-3 divide-y divide-amber-200 text-sm">
        {people.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <Link href={`/panel/clientes/${p.id}`} className="font-medium hover:underline">
              {p.full_name}
            </Link>
            <a
              href={`https://wa.me/${p.phone_e164.replace(/\D/g, "")}?text=${encodeURIComponent(`¡Feliz cumpleaños, ${p.full_name.split(" ")[0]}! 🎂`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-amber-900 hover:underline"
            >
              <MessageCircle className="size-4" aria-hidden />
              {formatPhone(p.phone_e164)}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
