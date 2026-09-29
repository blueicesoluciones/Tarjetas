"use client";

import { QRCodeSVG } from "qrcode.react";

export function CardQr({ value }: { value: string }) {
  return <QRCodeSVG value={value} size={200} level="M" marginSize={0} className="mx-auto h-auto w-52 max-w-full" />;
}
