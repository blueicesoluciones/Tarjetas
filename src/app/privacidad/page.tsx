import type { Metadata } from "next";
import { LegalLayout } from "@/components/admin/legal-layout";

export const metadata: Metadata = { title: "Política de privacidad" };

// Texto base editable. Pendiente: ajustar a la legislación del país de operación,
// completar razón social, domicilio y contacto del responsable.
const COMPANY = "[Nombre de la empresa]";
const CONTACT = "[email de contacto]";

export default function PrivacyPage() {
  return (
    <LegalLayout title="Política de privacidad" updated="[fecha]">
      <p>
        Esta política explica qué datos personales recogemos cuando creas una tarjeta de sellos digital en un negocio que
        usa nuestra plataforma, para qué los usamos y cuáles son tus derechos.
      </p>

      <h2>Quién es el responsable</h2>
      <p>
        La plataforma es operada por {COMPANY} (&ldquo;nosotros&rdquo;). Cada negocio donde te inscribes (cafetería,
        peluquería, tienda, etc.) es responsable de los datos de sus clientes y nosotros los tratamos por su cuenta para
        prestar el servicio de tarjetas de sellos. Puedes escribirnos a {CONTACT}.
      </p>

      <h2>Qué datos recogemos</h2>
      <ul>
        <li>Nombre.</li>
        <li>Número de teléfono.</li>
        <li>Email, solo si decides darlo (es opcional).</li>
        <li>
          Un PIN de 4 dígitos, que guardamos cifrado de forma irreversible. Nadie puede verlo, ni el negocio ni nosotros.
        </li>
        <li>El historial de sellos y premios canjeados en tu tarjeta.</li>
        <li>Si aceptaste o no recibir promociones del negocio.</li>
        <li>Datos técnicos mínimos para seguridad (por ejemplo, dirección IP para limitar intentos de ingreso).</li>
      </ul>

      <h2>Para qué los usamos</h2>
      <ul>
        <li>Crear y mostrar tu tarjeta de sellos, en la web y, si lo eliges, en Google Wallet o Apple Wallet.</li>
        <li>Permitir que el negocio te identifique en caja, sume sellos y entregue tus premios.</li>
        <li>Permitirte volver a entrar a tu tarjeta con tu teléfono y PIN.</li>
        <li>Proteger tu tarjeta frente a accesos no autorizados.</li>
        <li>Enviarte promociones del negocio, solo si lo aceptaste. Puedes retirar ese consentimiento cuando quieras.</li>
      </ul>
      <p>No vendemos tus datos ni los usamos para publicidad de terceros.</p>

      <h2>Con quién los compartimos</h2>
      <p>
        Con el negocio donde te inscribiste y con proveedores que nos ayudan a operar el servicio (alojamiento y base de
        datos). Si agregas la tarjeta a Google Wallet o Apple Wallet, el contenido de la tarjeta (tu nombre, los sellos y
        el código QR) se envía a Google o Apple para mostrarla en tu teléfono, de acuerdo con sus propias políticas.
      </p>

      <h2>Cuánto tiempo los guardamos</h2>
      <p>
        Mientras tu tarjeta esté activa y el negocio use la plataforma. Si pides la eliminación o el negocio deja la
        plataforma, borramos tus datos personales; conservamos solo estadísticas anónimas (por ejemplo, cantidad de sellos)
        que no permiten identificarte.
      </p>

      <h2>Tus derechos y cómo pedir la eliminación</h2>
      <p>
        Puedes pedir acceder a tus datos, corregirlos o eliminarlos. La forma más rápida es pedírselo directamente al
        negocio donde te inscribiste; también puedes escribirnos a {CONTACT} indicando el negocio y tu teléfono.
        Responderemos en un plazo razonable conforme a la ley aplicable.
      </p>

      <h2>Seguridad</h2>
      <p>
        Los datos de cada negocio están aislados entre sí, el PIN se guarda cifrado y el acceso del personal del negocio
        requiere usuario y contraseña. El enlace personal de tu tarjeta equivale a una llave: no lo compartas.
      </p>

      <h2>Cambios</h2>
      <p>Si cambiamos esta política, publicaremos la nueva versión en esta página con su fecha de actualización.</p>
    </LegalLayout>
  );
}
