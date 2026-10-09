import type { Metadata } from "next";
import Link from "next/link";
import { BrandHeader } from "@/components/customer/brand-header";
import { loadPublicBusiness } from "../data";
import { getSavedCard } from "@/lib/customers/service";
import { LoginForm } from "./login-form";
import { SavedPinForm } from "./saved-pin-form";

export const metadata: Metadata = { title: "Ingresar a mi tarjeta" };

export default async function CustomerLoginPage({ params, searchParams }: PageProps<"/n/[slug]/ingresar">) {
  const { slug } = await params;
  const { guardada } = await searchParams;
  const { business } = await loadPublicBusiness(slug);
  // «Ver mi tarjeta» desde la página del negocio: solo se pide el PIN.
  const savedCard = guardada === "1" ? await getSavedCard(business.id) : null;

  const whatsapp = business.contact_whatsapp?.replace(/\D/g, "");

  return (
    <div className="bg-muted/40 min-h-dvh">
      <BrandHeader
        name={business.name}
        logoUrl={business.logo_url}
        primaryColor={business.primary_color}
        textColor={business.text_color}
        backgroundUrl={business.card_background_url}
        subtitle={savedCard ? "Confirma tu PIN para ver tu tarjeta" : "Ingresa con tu celular y PIN"}
      />
      <main className="mx-auto -mt-10 max-w-md space-y-4 px-4 pb-12">
        <section className="bg-background rounded-2xl p-5 shadow-sm">
          {savedCard ? (
            <SavedPinForm
              slug={business.slug}
              firstName={savedCard.firstName}
              buttonColor={business.primary_color}
              buttonText={business.text_color}
              whatsappUrl={whatsapp ? `https://wa.me/${whatsapp}` : null}
            />
          ) : (
            <LoginForm
              slug={business.slug}
              country={business.default_country}
              buttonColor={business.primary_color}
              buttonText={business.text_color}
              whatsappUrl={whatsapp ? `https://wa.me/${whatsapp}` : null}
            />
          )}
        </section>
        <Link
          href={`/n/${business.slug}`}
          className="text-muted-foreground block text-center text-sm underline"
        >
          ← Crear una tarjeta nueva
        </Link>
      </main>
    </div>
  );
}
