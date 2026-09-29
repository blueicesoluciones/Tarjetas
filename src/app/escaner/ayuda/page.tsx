export default function HelpPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">Instalar la app en tu celular</h1>
      <section className="rounded-2xl bg-white/10 p-5">
        <h2 className="font-semibold">Android (Chrome)</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-white/80">
          <li>Toca el menú ⋮ arriba a la derecha.</li>
          <li>
            Elige <strong>Instalar app</strong> o <strong>Agregar a pantalla principal</strong>.
          </li>
        </ol>
      </section>
      <section className="rounded-2xl bg-white/10 p-5">
        <h2 className="font-semibold">iPhone (Safari)</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-white/80">
          <li>Toca el botón Compartir (cuadrado con flecha).</li>
          <li>
            Elige <strong>Añadir a pantalla de inicio</strong>.
          </li>
        </ol>
        <p className="mt-3 text-sm text-white/60">
          iPhone puede volver a pedir permiso de cámara cada vez que abres la app. Es normal: toca Permitir.
        </p>
      </section>
      <section className="rounded-2xl bg-white/10 p-5">
        <h2 className="font-semibold">Cómo sumar sellos</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-white/80">
          <li>Escanea el QR de la tarjeta del cliente (Wallet o tarjeta web).</li>
          <li>Revisa el nombre y toca <strong>+1 sello</strong>.</li>
          <li>Si te equivocaste, toca <strong>Deshacer</strong> en los minutos siguientes.</li>
          <li>Cuando complete los sellos, toca <strong>Canjear premio</strong> y confirma el nombre.</li>
        </ol>
      </section>
      <p className="text-center text-sm text-white/50">Se necesita conexión a internet para sumar sellos.</p>
    </div>
  );
}
