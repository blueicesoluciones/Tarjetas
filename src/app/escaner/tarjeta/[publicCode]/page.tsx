import { notFound } from "next/navigation";
import { CardConfirm } from "@/components/escaner/card-confirm";

export default async function ScannedCardPage({ params }: PageProps<"/escaner/tarjeta/[publicCode]">) {
  const { publicCode } = await params;
  const code = decodeURIComponent(publicCode);
  if (!/^[A-Za-z0-9_-]{12,64}$/.test(code)) notFound();
  return <CardConfirm publicCode={code} />;
}
