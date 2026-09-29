import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <p className="text-6xl font-bold tracking-tight text-muted-foreground/40">404</p>
      <h1 className="text-2xl font-bold">No encontramos esta página</h1>
      <p className="max-w-sm text-muted-foreground">
        Puede que el enlace esté mal escrito o que la tarjeta ya no exista. Si es tu tarjeta, pide al negocio un enlace nuevo.
      </p>
      <Link href="/" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
        Ir al inicio
      </Link>
    </main>
  );
}
