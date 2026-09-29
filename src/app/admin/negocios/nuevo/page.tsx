import type { Metadata } from "next";
import Link from "next/link";
import { NewBusinessForm } from "./new-business-form";

export const metadata: Metadata = { title: "Nuevo negocio" };

export default function NewBusinessPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/admin/negocios" className="text-sm text-muted-foreground hover:underline">
          ← Negocios
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Nuevo negocio</h1>
        <p className="text-sm text-muted-foreground">
          Crea el negocio, su programa de sellos e invita al dueño por email.
        </p>
      </div>
      <NewBusinessForm />
    </div>
  );
}
