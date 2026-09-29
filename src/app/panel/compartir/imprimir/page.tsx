import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { BusinessLogo } from "@/components/customer/brand-header";
import { getBusinessWithProgram } from "@/lib/auth/business";
import { requireStaff } from "@/lib/auth/staff";
import { appUrl } from "@/lib/env";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Imprimir QR" };

export default async function PrintQrPage() {
  const ctx = await requireStaff(["owner"], { needsBusiness: true });
  const { business, program } = await getBusinessWithProgram(ctx.businessId!);
  if (!business || !program) notFound();
  const url = appUrl(`/n/${business.slug}`);

  return (
    <div className="print-sheet flex flex-col items-center gap-6 py-6 text-center">
      <style>{`
        @page { size: A4; margin: 16mm; }
        @media print {
          body * { visibility: hidden; }
          .print-sheet, .print-sheet * { visibility: visible; }
          .print-sheet { position: absolute; inset: 0; }
          .no-print { display: none !important; }
        }
      `}</style>
      <PrintButton />
      <div
        className="w-full max-w-md rounded-3xl p-8"
        style={{ backgroundColor: business.primary_color, color: business.text_color, printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
      >
        <div className="flex flex-col items-center gap-3">
          <BusinessLogo
            name={business.name}
            logoUrl={business.logo_url}
            primaryColor={business.primary_color}
            textColor={business.text_color}
            size={80}
          />
          <p className="text-3xl font-bold">{business.name}</p>
          <p className="text-xl">Escanea y obtén tu tarjeta de sellos</p>
        </div>
        <div className="mx-auto mt-6 w-fit rounded-2xl bg-white p-4">
          <QRCodeSVG value={url} size={280} level="M" />
        </div>
        <p className="mt-6 text-lg">
          Junta <strong>{program.stamps_required} sellos</strong> y llévate:
        </p>
        <p className="text-2xl font-bold">{program.reward_description}</p>
        <p className="mt-4 text-xs opacity-75">Sin apps ni registro. Solo tu nombre y teléfono.</p>
      </div>
      <p className="font-mono text-xs text-muted-foreground">{url}</p>
    </div>
  );
}
