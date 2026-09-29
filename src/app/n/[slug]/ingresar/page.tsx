import type { Metadata } from "next";
import Link from "next/link";
import { BrandHeader } from "@/components/customer/brand-header";
import { loadPublicBusiness } from "../data";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Ingresar a mi tarjeta" };

export default async function CustomerLoginPage({ params }: PageProps<"/n/[slug]/ingresar">) {
  const { slug } = await params;
  const { business } = await loadPublicBusiness(slug);

  const whatsapp = business.contact_whatsapp?.replace(/\D/g, "");

  return (
    <div className="min-h-dvh bg-muted/40">
      <BrandHeader
        name={business.name}
        logoUrl={business.logo_url}
        primaryColor={business.primary_color}
        textColor={business.text_color}
        subtitle="Ingresa con tu teléfono y PIN"
      />
      <main className="mx-auto -mt-10 max-w-md space-y-4 px-4 pb-12">
        <section className="rounded-2xl bg-background p-5 shadow-sm">
          <LoginForm
            slug={business.slug}
            buttonColor={business.primary_color}
            buttonText={business.text_color}
            whatsappUrl={whatsapp ? `https://wa.me/${whatsapp}` : null}
          />
        </section>
        <Link href={`/n/${business.slug}`} className="block text-center text-sm text-muted-foreground underline">
          ← Crear una tarjeta nueva
        </Link>
      </main>
    </div>
  );
}
