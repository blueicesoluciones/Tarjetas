import Image from "next/image";

interface BrandHeaderProps {
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  textColor: string;
  subtitle?: string;
}

export function BrandHeader({ name, logoUrl, primaryColor, textColor, subtitle }: BrandHeaderProps) {
  return (
    <header className="px-5 pt-10 pb-16 text-center" style={{ backgroundColor: primaryColor, color: textColor }}>
      <div className="mx-auto flex max-w-md flex-col items-center gap-3">
        <BusinessLogo name={name} logoUrl={logoUrl} primaryColor={primaryColor} textColor={textColor} size={72} />
        <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
        {subtitle ? <p className="text-sm opacity-80">{subtitle}</p> : null}
      </div>
    </header>
  );
}

export function BusinessLogo({
  name,
  logoUrl,
  primaryColor,
  textColor,
  size,
}: {
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  textColor: string;
  size: number;
}) {
  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt={`Logo de ${name}`}
        width={size}
        height={size}
        className="rounded-full bg-white object-cover ring-2 ring-white/40"
        style={{ width: size, height: size }}
        unoptimized
      />
    );
  }
  return (
    <div
      aria-hidden
      className="flex items-center justify-center rounded-full font-bold ring-2"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        backgroundColor: textColor,
        color: primaryColor,
        borderColor: textColor,
      }}
    >
      {name.trim().charAt(0).toUpperCase()}
    </div>
  );
}
