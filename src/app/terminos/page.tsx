import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout } from "@/components/admin/legal-layout";

export const metadata: Metadata = { title: "Términos de uso" };

// Texto base editable. Pendiente: país de operación y ley aplicable.
const COMPANY = "[Nombre de la empresa]";
const CONTACT = "[email de contacto]";

export default function TermsPage() {
  return (
    <LegalLayout title="Términos de uso" updated="[fecha]">
      <p>
        Estos términos regulan el uso de la plataforma de tarjetas de sellos digitales operada por {COMPANY}. Al crear
        una tarjeta o usar la plataforma aceptas estos términos.
      </p>

      <h2>El servicio</h2>
      <p>
        La plataforma permite a los negocios ofrecer tarjetas de sellos digitales a sus clientes. Cada negocio define sus
        propias reglas: cuántos sellos se necesitan, cuál es el premio y cada cuánto se puede sumar un sello.
      </p>

      <h2>Para clientes</h2>
      <ul>
        <li>La tarjeta es gratuita, personal e intransferible.</li>
        <li>Los sellos solo los suma el personal del negocio. No tienen valor monetario ni se pueden canjear por dinero.</li>
        <li>
          Los premios, su disponibilidad y sus condiciones son responsabilidad exclusiva del negocio que los ofrece.
        </li>
        <li>Eres responsable de mantener en reserva tu PIN y el enlace personal de tu tarjeta.</li>
        <li>
          El negocio puede corregir el saldo de sellos ante errores o usos indebidos, y bloquear tarjetas usadas de forma
          fraudulenta.
        </li>
      </ul>

      <h2>Para negocios</h2>
      <ul>
        <li>El negocio es responsable del uso que su personal hace de la plataforma y de cumplir con los premios ofrecidos.</li>
        <li>El negocio debe tratar los datos de sus clientes conforme a la <Link href="/privacidad" className="underline">política de privacidad</Link> y la ley aplicable.</li>
        <li>Podemos suspender cuentas que incumplan estos términos o usen la plataforma de forma indebida.</li>
      </ul>

      <h2>Disponibilidad</h2>
      <p>
        Hacemos nuestro mejor esfuerzo para que el servicio funcione de forma continua, pero puede haber interrupciones por
        mantenimiento o causas ajenas. Google Wallet y Apple Wallet son servicios de terceros y su disponibilidad no
        depende de nosotros.
      </p>

      <h2>Responsabilidad</h2>
      <p>
        En la medida permitida por la ley, no somos responsables por premios no entregados por un negocio ni por daños
        indirectos derivados del uso del servicio.
      </p>

      <h2>Cambios y contacto</h2>
      <p>
        Podemos actualizar estos términos; la versión vigente estará siempre en esta página. Para cualquier consulta,
        escríbenos a {CONTACT}. Estos términos se rigen por las leyes de [país de operación].
      </p>
    </LegalLayout>
  );
}
