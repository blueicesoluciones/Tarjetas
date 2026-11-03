import { BranchLogoUpload } from "@/components/staff/branch-logo-upload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Branch } from "@/types/db";

/** Logo de cada sede: se ve dentro de los sellos puestos en ella. */
export function BranchLogos({ branches }: { branches: Branch[] }) {
  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Logos de tus sedes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          Cada sello muestra el logo de la sede donde se puso, en la tarjeta web y en Google y Apple Wallet. Los sellos sin sede, o
          de una sede sin logo, se ven con el chulo de siempre.
        </p>
        <ul className="divide-y rounded-lg border">
          {branches.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className={b.is_active ? "font-medium" : "font-medium text-muted-foreground"}>
                  {b.name}
                  {b.is_active ? null : <span className="ml-2 text-xs font-normal">(desactivada)</span>}
                </p>
                {b.address ? <p className="text-xs text-muted-foreground">{b.address}</p> : null}
              </div>
              <BranchLogoUpload branch={{ id: b.id, name: b.name, logoUrl: b.logo_url }} endpoint="/panel/programa/sede-logo" />
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          Usa un ícono simple o una inicial: el sello es pequeño y un logo con texto no se alcanza a leer. La imagen se recorta en
          círculo automáticamente. PNG, JPG o WEBP, máximo 5 MB.
        </p>
      </CardContent>
    </Card>
  );
}
