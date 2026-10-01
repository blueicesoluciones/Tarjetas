import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout } from "@/components/admin/legal-layout";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Soporte",
  description: "Ayuda para clientes y negocios que usan las tarjetas de sellos digitales.",
};

interface Faq {
  q: string;
  a: React.ReactNode;
}

const CUSTOMER_FAQ: Faq[] = [
  {
    q: "¿Cómo creo mi tarjeta?",
    a: (
      <>
        Escanea el código QR que el negocio tiene en su local o abre el enlace que te compartió. Toca{" "}
        <strong>Crear mi tarjeta</strong>, escribe tu nombre, tu celular de 10 dígitos y elige un PIN de 4 números. No
        necesitas instalar aplicaciones ni crear contraseñas.
      </>
    ),
  },
  {
    q: "¿Cómo sumo sellos?",
    a: "En cada compra, muestra en caja el código QR de tu tarjeta (en Google Wallet o en la tarjeta web). El personal del negocio lo escanea y suma el sello. Los sellos solo los puede sumar el negocio.",
  },
  {
    q: "Cambié de celular o perdí el enlace de mi tarjeta",
    a: (
      <>
        Escanea de nuevo el QR del negocio, toca <strong>Ya tengo tarjeta</strong> e ingresa con tu celular y tu PIN.
        Tus sellos siguen ahí.
      </>
    ),
  },
  {
    q: "Olvidé mi PIN",
    a: (
      <>
        Pídele al negocio que restablezca tu PIN. Te darán un PIN temporal: escanea el QR del negocio, toca{" "}
        <strong>Ya tengo tarjeta</strong>, ingresa con tu celular y ese PIN temporal, y el sistema te pedirá crear uno
        nuevo que solo tú conocerás. El PIN temporal vence en 24 horas.
      </>
    ),
  },
  {
    q: "Mi tarjeta dice que está bloqueada por intentos",
    a: "Por seguridad, después de varios PIN incorrectos el ingreso se bloquea por 15 minutos. Si se repite varias veces, el bloqueo es permanente hasta que el negocio restablezca tu PIN.",
  },
  {
    q: "¿Cómo la agrego a Google Wallet?",
    a: (
      <>
        En Android, abre tu tarjeta y toca <strong>Agregar a la Billetera de Google</strong>. En iPhone puedes abrir tu
        tarjeta en Safari, tocar <strong>Compartir</strong> y elegir <strong>Añadir a pantalla de inicio</strong>. Si
        abriste el enlace desde Instagram, Facebook o WhatsApp, ábrelo primero en Chrome o Safari.
      </>
    ),
  },
  {
    q: "Sumé un sello pero no aparece en Google Wallet",
    a: "La tarjeta en Google Wallet se actualiza sola, pero puede tardar unos minutos. Tu tarjeta web siempre muestra el conteo real.",
  },
  {
    q: "¿Quién entrega los premios?",
    a: "Cada negocio define cuántos sellos se necesitan, cuál es el premio y sus condiciones, y es quien lo entrega. Ante cualquier duda sobre un premio, consulta directamente con el negocio.",
  },
  {
    q: "Quiero corregir o eliminar mis datos",
    a: (
      <>
        Puedes pedírselo al negocio o escribirnos. Consulta tus derechos en la{" "}
        <Link href="/privacidad" className="underline">
          política de tratamiento de datos
        </Link>
        .
      </>
    ),
  },
];

const BUSINESS_FAQ: Faq[] = [
  {
    q: "¿Cómo inscribo mi negocio?",
    a: "Escríbenos y creamos tu negocio, tu programa de sellos y los usuarios de tu equipo. Te entregamos las credenciales para entrar al panel.",
  },
  {
    q: "Necesito un usuario nuevo o cambiar una contraseña",
    a: "Escríbenos indicando el negocio, el nombre de la persona y su rol (dueño o cajero).",
  },
  {
    q: "La cámara del escáner no abre",
    a: "Revisa que el navegador tenga permiso para usar la cámara. En iPhone: Ajustes → Safari → Cámara → Permitir. Mientras tanto, puedes buscar al cliente por nombre o celular desde la opción Buscar del escáner.",
  },
];

function FaqList({ items }: { items: Faq[] }) {
  return (
    <div className="space-y-3">
      {items.map((f) => (
        <details key={f.q} className="group rounded-lg border px-4 py-3 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
            {f.q}
            <span aria-hidden className="text-muted-foreground transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <div className="mt-2 text-muted-foreground">{f.a}</div>
        </details>
      ))}
    </div>
  );
}

export default function SupportPage() {
  return (
    <LegalLayout title="Soporte">
      <p>
        Aquí encuentras respuestas a las preguntas más comunes sobre las tarjetas de sellos digitales. Si no encuentras lo
        que buscas, escríbenos.
      </p>

      <div className="rounded-xl border bg-muted/40 p-5">
        <p className="font-semibold">Contacto</p>
        <p className="mt-1">
          <a href={`mailto:${LEGAL.email}`} className="font-medium underline">
            {LEGAL.email}
          </a>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Respondemos en 1 a 2 días hábiles. Si tu consulta es sobre una tarjeta, incluye el nombre del negocio y tu
          celular. Nunca te pediremos tu PIN.
        </p>
      </div>

      <h2>Para clientes</h2>
      <FaqList items={CUSTOMER_FAQ} />

      <h2>Para negocios</h2>
      <FaqList items={BUSINESS_FAQ} />

      <p className="text-sm text-muted-foreground">
        Servicio operado por {LEGAL.company}, {LEGAL.country}. Consulta también los{" "}
        <Link href="/terminos" className="underline">
          términos de uso
        </Link>
        .
      </p>
    </LegalLayout>
  );
}
