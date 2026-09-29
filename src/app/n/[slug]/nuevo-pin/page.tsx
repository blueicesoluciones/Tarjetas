import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BrandHeader } from "@/components/customer/brand-header";
import { getPinChangeTicket } from "@/lib/customer-session";
import { loadPublicBusiness } from "../data";
import { ChangePinForm } from "./change-pin-form";

export const metadata: Metadata = { title: "Crea tu nuevo PIN" };

export default async function NewPinPage({ params }: PageProps<"/n/[slug]/nuevo-pin">) {
  const { slug } = await params;
  const { business } = await loadPublicBusiness(slug);
  const ticket = await getPinChangeTicket();
  if (!ticket || ticket.businessId !== business.id) redirect(`/n/${business.slug}/ingresar`);

  return (
    <div className="min-h-dvh bg-muted/40">
      <BrandHeader
        name={business.name}
        logoUrl={business.logo_url}
        primaryColor={business.primary_color}
        textColor={business.text_color}
        backgroundUrl={business.card_background_url}
        subtitle="Crea un PIN nuevo para tu tarjeta"
      />
      <main className="mx-auto -mt-10 max-w-md px-4 pb-12">
        <section className="rounded-2xl bg-background p-5 shadow-sm">
          <ChangePinForm buttonColor={business.primary_color} buttonText={business.text_color} />
        </section>
      </main>
    </div>
  );
}
