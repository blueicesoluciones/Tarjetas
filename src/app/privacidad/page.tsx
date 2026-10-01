import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout } from "@/components/admin/legal-layout";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Política de tratamiento de datos personales" };

/**
 * Política de tratamiento de datos personales conforme a la Ley Estatutaria
 * 1581 de 2012 (habeas data) y el Decreto 1074 de 2015 (que compila el
 * Decreto 1377 de 2013).
 */
export default function PrivacyPage() {
  const { company, email, country, taxId, address } = LEGAL;
  return (
    <LegalLayout title="Política de tratamiento de datos personales" updated={LEGAL.updated}>
      <p>
        Esta política explica cómo se recogen, usan, almacenan y protegen los datos personales de quienes crean una
        tarjeta de sellos digital en un negocio que usa nuestra plataforma, y cómo puedes ejercer tus derechos como
        titular, en cumplimiento de la Ley Estatutaria 1581 de 2012, el Decreto 1074 de 2015 y demás normas de protección
        de datos personales de {country} (derecho de habeas data, artículo 15 de la Constitución Política).
      </p>

      <h2>1. Responsable y encargado del tratamiento</h2>
      <p>
        <strong>Responsable:</strong> cada negocio (cafetería, peluquería, tienda, etc.) donde te inscribes es el
        responsable del tratamiento de los datos de sus clientes: decide sobre su uso y es quien te ofrece la tarjeta y
        los premios.
      </p>
      <p>
        <strong>Encargado:</strong> {company}
        {taxId ? `, NIT ${taxId}` : ""}, con domicilio en {address ?? country}, opera la plataforma tecnológica y trata
        los datos por cuenta de cada negocio para prestar el servicio de tarjetas de sellos. Correo de contacto:{" "}
        <a href={`mailto:${email}`} className="underline">
          {email}
        </a>
        .
      </p>

      <h2>2. Datos que se recogen</h2>
      <ul>
        <li>Nombre.</li>
        <li>Número de celular.</li>
        <li>Correo electrónico, solo si decides darlo (es opcional).</li>
        <li>
          Un PIN de 4 dígitos, que se guarda cifrado de forma irreversible. Nadie puede verlo: ni el negocio ni{" "}
          {company}.
        </li>
        <li>El historial de sellos y premios canjeados en tu tarjeta.</li>
        <li>Si autorizaste o no recibir promociones del negocio.</li>
        <li>Datos técnicos mínimos de seguridad, como la dirección IP, para limitar intentos de ingreso.</li>
      </ul>
      <p>
        No se recogen datos sensibles (como salud, origen étnico, orientación política o religiosa) ni datos biométricos.
        El servicio no está dirigido a menores de edad; si eres menor de 18 años, tu inscripción debe hacerla o
        autorizarla tu representante legal.
      </p>

      <h2>3. Finalidades del tratamiento</h2>
      <ul>
        <li>Crear y mostrar tu tarjeta de sellos en la web y, si lo eliges, en Google Wallet o Apple Wallet.</li>
        <li>Permitir que el personal del negocio te identifique en caja, sume sellos y entregue tus premios.</li>
        <li>Permitirte volver a entrar a tu tarjeta con tu celular y PIN, y restablecer tu PIN con ayuda del negocio.</li>
        <li>Proteger tu tarjeta frente a accesos no autorizados y prevenir fraudes.</li>
        <li>Generar estadísticas agregadas para el negocio (por ejemplo, cantidad de sellos y canjes).</li>
        <li>
          Enviarte promociones del negocio, únicamente si lo autorizaste de forma expresa. Puedes revocar esa autorización
          en cualquier momento.
        </li>
      </ul>
      <p>Tus datos no se venden ni se usan para publicidad de terceros.</p>

      <h2>4. Autorización</h2>
      <p>
        Al crear tu tarjeta marcas la casilla con la que autorizas de manera previa, expresa e informada el tratamiento
        de tus datos para las finalidades de esta política. La autorización para recibir promociones es independiente y
        opcional. Se conserva registro de la fecha en que diste tu autorización.
      </p>

      <h2>5. Derechos del titular</h2>
      <p>Como titular de los datos tienes derecho a:</p>
      <ul>
        <li>Conocer, actualizar y rectificar tus datos personales.</li>
        <li>Solicitar prueba de la autorización que otorgaste.</li>
        <li>Ser informado, previa solicitud, sobre el uso que se ha dado a tus datos.</li>
        <li>
          Presentar quejas ante la Superintendencia de Industria y Comercio (SIC) por infracciones a la ley, una vez
          hayas agotado el trámite de consulta o reclamo ante el responsable o el encargado.
        </li>
        <li>
          Revocar la autorización y/o solicitar la supresión de tus datos cuando no se respeten los principios, derechos
          y garantías legales, siempre que no exista un deber legal o contractual de conservarlos.
        </li>
        <li>Acceder de forma gratuita a tus datos personales.</li>
      </ul>

      <h2>6. Cómo ejercer tus derechos (consultas y reclamos)</h2>
      <p>
        Puedes dirigirte directamente al negocio donde te inscribiste o escribir a{" "}
        <a href={`mailto:${email}`} className="underline">
          {email}
        </a>{" "}
        indicando tu nombre, tu número de celular, el negocio, tu solicitud y un medio de respuesta.
      </p>
      <ul>
        <li>
          <strong>Consultas</strong> (conocer tus datos o cómo se usan): se responden en un máximo de 10 días hábiles,
          prorrogables por 5 días hábiles más, informándote el motivo.
        </li>
        <li>
          <strong>Reclamos</strong> (corrección, actualización, supresión o revocatoria): se responden en un máximo de 15
          días hábiles, prorrogables por 8 días hábiles más, informándote el motivo. Si el reclamo está incompleto te
          pediremos completarlo dentro de los 5 días siguientes.
        </li>
      </ul>
      <p>
        Al eliminar tus datos se borran tu nombre, celular, correo y PIN, y tu tarjeta queda desactivada. Se conserva
        solo información estadística anónima que no permite identificarte.
      </p>

      <h2>7. Con quién se comparten los datos</h2>
      <p>
        Con el negocio donde te inscribiste y con los proveedores tecnológicos que permiten operar el servicio
        (alojamiento web y base de datos), que actúan bajo instrucciones y con obligaciones de confidencialidad. Si
        agregas la tarjeta a Google Wallet o Apple Wallet, el contenido de la tarjeta (tu nombre, los sellos y el código
        QR) se envía a Google o Apple para mostrarla en tu teléfono, según sus propias políticas.
      </p>
      <p>
        Algunos de estos proveedores almacenan la información en servidores ubicados fuera de {country} (por ejemplo, en
        Estados Unidos). Esta transmisión se realiza únicamente para prestar el servicio y con proveedores que ofrecen
        niveles adecuados de protección de datos.
      </p>

      <h2>8. Seguridad</h2>
      <p>
        Los datos de cada negocio están aislados entre sí, el PIN se guarda cifrado, el acceso del personal del negocio
        requiere usuario y contraseña, y los intentos de ingreso están limitados. El enlace personal de tu tarjeta
        equivale a una llave: no lo compartas.
      </p>

      <h2>9. Vigencia</h2>
      <p>
        Esta política rige desde la fecha de su última actualización. Los datos se conservan mientras tu tarjeta esté
        activa y el negocio use la plataforma, o hasta que solicites su supresión. Si la política cambia de forma
        sustancial, publicaremos la nueva versión en esta página con su fecha. Consulta también los{" "}
        <Link href="/terminos" className="underline">
          términos de uso
        </Link>
        .
      </p>
    </LegalLayout>
  );
}
