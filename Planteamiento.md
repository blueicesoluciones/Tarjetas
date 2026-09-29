# CLAUDE.md — Plataforma de tarjetas de fidelidad digitales

> Este archivo es la fuente de verdad del proyecto. Léelo completo antes de escribir código.
> Si una decisión no está aquí, pregunta antes de asumir. Si algo de aquí cambia, actualiza este archivo.

---

## 1. Resumen del proyecto

Plataforma SaaS multi-negocio (multi-tenant) que se vende a emprendimientos (cafeterías, peluquerías, tiendas, etc.) para que ofrezcan **tarjetas de sellos digitales** a sus clientes.

- El cliente final obtiene una tarjeta con su nombre, el logo del negocio y un QR.
- La tarjeta puede vivir en **Google Wallet**, **Apple Wallet** (fase posterior) o como **tarjeta web**.
- Los cajeros suman sellos escaneando el QR desde una **PWA** instalada en su celular.
- Al completar los sellos, el cliente canjea un premio.
- El dueño de la plataforma (super admin) administra todos los negocios.

### Principios de diseño

1. **El cliente final no crea cuenta ni instala apps.** Solo nombre, teléfono y un PIN de 4 dígitos.
2. **Los datos de cada negocio están aislados** a nivel de base de datos (Row Level Security), no solo en el frontend.
3. **Sumar sellos siempre requiere un usuario del negocio autenticado.** Nunca el cliente se auto-sella.
4. **La tarjeta web existe siempre** para todos los clientes. Wallet es un extra sobre la misma tarjeta (mismo QR, mismo contador).
5. **Costo cero al inicio:** planes gratuitos de Supabase y Vercel. Apple Wallet se agrega después.
6. **Apple Wallet se diseña desde ya pero se implementa después.** El código debe tener un módulo de Wallet con proveedores intercambiables.

---

## 2. Estado actual y restricciones

| Tema | Estado |
|---|---|
| Google Wallet | Se implementa en modo demo (solo cuentas de prueba) mientras se tramita la aprobación de producción |
| Apple Wallet | **Pendiente.** No hay cuenta de Apple Developer aún. Implementar solo interfaces y stubs, detrás de un feature flag `APPLE_WALLET_ENABLED=false` |
| Hosting | Vercel plan Hobby (gratis) |
| Base de datos | Supabase plan Free |
| Dominio | Pendiente de compra; mientras tanto usar `*.vercel.app` |
| Pagos (cobro a negocios) | Fuera de alcance por ahora (Fase 6) |

### Advertencias de los planes gratuitos (tenerlas en cuenta)

- **Supabase Free pausa el proyecto tras ~7 días sin actividad.** Durante el desarrollo no es problema; antes del piloto con negocios reales hay que evaluar pasar a Pro (25 USD/mes) o mantener actividad.
- **El SMTP incluido de Supabase Auth tiene un límite muy bajo de emails por hora** y es solo para pruebas. Configurar SMTP propio con Resend (plan gratis) antes de invitar usuarios reales.
- **El plan Hobby de Vercel es para uso no comercial** según sus términos. Sirve para desarrollo y pruebas; cuando se cobre a negocios hay que pasar a Vercel Pro (20 USD/mes) o migrar a otro hosting.

---

## 3. Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | **Next.js (App Router) + TypeScript (strict)** |
| Estilos | Tailwind CSS |
| Componentes UI | shadcn/ui |
| Base de datos, Auth, Storage | **Supabase** (Postgres + Auth + Storage) |
| Cliente Supabase | `@supabase/ssr` y `@supabase/supabase-js` |
| Validación | `zod` en todas las entradas de API y formularios |
| Formularios | `react-hook-form` + `zod` |
| Teléfonos | `libphonenumber-js` (normalizar a E.164) |
| Hash de PIN | `bcryptjs` (en el servidor, nunca en el cliente) |
| IDs y tokens aleatorios | `nanoid` (o `crypto.randomBytes`) |
| Escaneo QR | `html5-qrcode` (funciona en iOS Safari y Android; no depender de `BarcodeDetector`) |
| Generar QR en pantalla | `qrcode` o `qrcode.react` |
| Imágenes dinámicas de sellos | `@vercel/og` (`ImageResponse`) |
| Google Wallet | REST API de Google Wallet + `google-auth-library` + `jsonwebtoken` |
| Apple Wallet (futuro) | `passkit-generator` + push APNs por HTTP/2 con clave `.p8` |
| Emails | Resend (plan gratis) |
| Tests | Vitest (lógica de negocio y funciones puras) |
| Deploy | Vercel |

### Convenciones de código

- TypeScript estricto, sin `any` salvo justificación.
- Identificadores de código, tablas y columnas **en inglés**. Textos de interfaz **en español**.
- Migraciones SQL versionadas en `supabase/migrations/`. Nunca modificar la base de datos a mano sin migración.
- Toda lógica crítica de sellos, canjes y PIN vive en el **servidor** (Route Handlers, Server Actions o funciones Postgres), nunca en el cliente.
- La `SUPABASE_SERVICE_ROLE_KEY` solo se usa en código de servidor. Nunca con prefijo `NEXT_PUBLIC_`.
- Fechas en UTC en la base de datos; se muestran en la zona horaria del negocio.
- Commits pequeños por tarea.

---

## 4. Roles y permisos

| Rol | Quién es | Autenticación |
|---|---|---|
| `super_admin` | Dueño de la plataforma | Supabase Auth (email + contraseña) |
| `owner` | Dueño de un emprendimiento | Supabase Auth |
| `cashier` | Cajero/empleado de un emprendimiento | Supabase Auth |
| Cliente final | Cliente de un emprendimiento | **No usa Supabase Auth.** Sesión propia con teléfono + PIN o enlace personal |

### Matriz de permisos

| Acción | super_admin | owner | cashier | cliente |
|---|---|---|---|---|
| Ver/crear/editar/suspender negocios | Todos | — | — | — |
| Entrar a un negocio en modo "ver como" | Sí | — | — | — |
| Editar programa (sellos, premio, diseño) | Todos | Su negocio | — | — |
| Gestionar cajeros | Todos | Su negocio | — | — |
| Ver lista de clientes y detalle | Todos | Su negocio | Solo búsqueda para sellar | — |
| Escanear y sumar sello | Sí | Su negocio | Su negocio | — |
| Sumar/restar sellos manualmente | Sí | Su negocio | — | — |
| Deshacer último sello (ventana corta) | Sí | Su negocio | Solo sus propios sellos | — |
| Canjear premio | Sí | Su negocio | Su negocio | — |
| **Restablecer PIN de un cliente** | Sí | **Su negocio** | **No** | — |
| Ver PIN de un cliente | **Nadie** | **Nadie** | **Nadie** | — |
| Ver auditoría | Todo | Su negocio | — | — |
| Ver su propia tarjeta | — | — | — | Sí |

**Decisión tomada:** solo el `owner` (y el `super_admin`) puede restablecer PIN. Los cajeros no.

---

## 5. Conceptos del dominio

- **Business (negocio):** un emprendimiento cliente de la plataforma. Tiene `slug` público, logo y colores.
- **Program (programa):** reglas de la tarjeta de un negocio: cuántos sellos se necesitan, cuál es el premio, tiempo mínimo entre sellos. **Un programa activo por negocio** en esta versión.
- **Customer (cliente):** persona inscrita en un negocio. Identificada por teléfono dentro de ese negocio. La misma persona en dos negocios distintos son dos registros distintos.
- **Card (tarjeta):** la tarjeta del cliente en un programa. Tiene el contador de sellos, un `public_code` (va en el QR) y un `access_token` (va en el enlace personal).
- **Stamp event (evento):** cada cambio en el contador: sello, ajuste manual, canje, deshacer. Es el historial inmutable.
- **Redemption (canje):** cuando el cliente cobra el premio.

---

## 6. Flujos detallados

### 6.1 Alta de un negocio (super admin)

1. Super admin crea el negocio: nombre, slug, logo, colores, zona horaria.
2. Crea el programa: sellos requeridos (ej. 10), descripción del premio, cooldown.
3. Invita al dueño por email; el dueño define su contraseña.
4. El sistema crea la clase de Google Wallet del negocio (ver sección 11).
5. El negocio queda con estado `active` y su enlace público `/n/[slug]` operativo.

### 6.2 Inscripción del cliente

Entrada: el cliente abre `/n/[slug]` desde un QR impreso, enlace compartido por WhatsApp, redes, etc.

1. **Detección de dispositivo** (ver 6.10) y **detección de navegador interno** (ver 6.11).
2. **Si el dispositivo ya tiene una tarjeta de ese negocio** (cookie de sesión válida), redirigir directo a su tarjeta `/t/[accessToken]`.
3. Si no, mostrar dos opciones: **"Crear mi tarjeta"** y **"Ya tengo tarjeta"**.
4. Formulario de creación:
   - Nombre (obligatorio)
   - Teléfono (obligatorio, normalizado a E.164, país por defecto configurable por negocio)
   - Email (opcional)
   - PIN de 4 dígitos + confirmación (obligatorio)
   - Casilla de aceptación de política de privacidad (obligatoria) con enlace a `/privacidad`
   - Casilla de consentimiento para recibir promociones (opcional, desmarcada por defecto)
5. Validaciones:
   - PIN: exactamente 4 dígitos. Rechazar PIN triviales: `0000`, `1111`…`9999`, `1234`, `4321`, `0123`, `9876`.
   - Si el teléfono ya existe en ese negocio: **no crear duplicado**. Mostrar "Ya tienes una tarjeta en este negocio" y ofrecer ingresar con teléfono + PIN.
6. Servidor: crea `customer` (PIN hasheado con bcrypt) y `card` (con `public_code` y `access_token` aleatorios), registra evento de auditoría, crea el objeto de Google Wallet de forma no bloqueante.
7. Establece la cookie de sesión del cliente (ver 7.3).
8. Redirige a `/t/[accessToken]` con botones:
   - Android → **"Agregar a Google Wallet"**
   - iPhone → **"Agregar a Apple Wallet"** (solo si `APPLE_WALLET_ENABLED`; si no, mostrar instrucciones para "Añadir a pantalla de inicio")
   - Siempre → la tarjeta web visible en la misma página

### 6.3 Reingreso del cliente (sin Wallet)

1. El cliente escanea de nuevo el QR del local o abre `/n/[slug]`.
2. Si hay cookie válida → directo a su tarjeta.
3. Si no → "Ya tengo tarjeta" → teléfono + PIN.
4. Servidor valida con límite de intentos (ver 7.2).
5. Si es correcto → crea cookie de sesión y redirige a `/t/[accessToken]`.
6. Si el PIN es temporal (`pin_must_change = true`) → obligar a crear un PIN nuevo antes de mostrar la tarjeta.
7. Mensaje de error genérico: "Teléfono o PIN incorrectos" (no revelar si el teléfono existe).

### 6.4 Olvidé mi PIN

1. En la pantalla de ingreso, enlace "Olvidé mi PIN" que muestra: "Pide al negocio que restablezca tu PIN" (y opcionalmente el WhatsApp del negocio si lo configuró).
2. El owner busca al cliente por teléfono en `/panel/clientes`, verifica su identidad (en persona o preguntando el nombre) y pulsa **"Restablecer PIN"**.
3. El sistema genera un **PIN temporal aleatorio de 4 dígitos**, lo muestra **una sola vez** en pantalla al owner, guarda solo su hash, marca `pin_must_change = true`, `pin_temp_expires_at = now() + 24h`, y resetea los contadores de intentos y bloqueo.
4. El owner le dice el PIN temporal al cliente.
5. El cliente ingresa con teléfono + PIN temporal y el sistema lo obliga a crear un PIN nuevo.
6. Si el temporal vence sin usarse, deja de funcionar y hay que restablecer de nuevo.
7. Todo restablecimiento queda en `audit_logs` (quién, cuándo, a qué cliente).

### 6.5 Sumar un sello (cajero)

1. El cajero abre la PWA `/escaner`, ya autenticado.
2. Escanea el QR de la tarjeta (en Wallet o en la tarjeta web).
3. La app lee el valor, lo valida (formato de la sección 9) y consulta el resumen de la tarjeta: nombre completo del cliente, sellos actuales/requeridos, si tiene premio disponible, último sello.
4. Pantalla de confirmación con botón grande **"+1 sello"**. No sumar automáticamente al escanear (evita dobles sellos por escaneos repetidos).
5. Servidor ejecuta la función `add_stamp` (sección 8.4), que valida:
   - El usuario pertenece al mismo negocio que la tarjeta (o es super_admin).
   - El negocio y la tarjeta están activos.
   - Se respeta el cooldown del programa. Si no, error claro: "Esta tarjeta ya recibió un sello hace X minutos".
6. Tras éxito: sincronizar Wallet (sección 10), mostrar resultado ("7 de 10 sellos") y botón **"Deshacer"** visible durante la ventana de deshacer.
7. Si con ese sello completa el programa → mostrar "¡Premio disponible!".

### 6.6 Búsqueda manual en caja

Para clientes sin teléfono o sin tarjeta a mano: en `/escaner/buscar`, el cajero busca por teléfono (o nombre, parcial), selecciona al cliente y sigue el mismo flujo de confirmación del 6.5. Mostrar nombre completo para confirmar identidad.

### 6.7 Canjear premio

1. Al escanear o buscar una tarjeta con `stamps_count >= stamps_required`, se muestra el botón **"Canjear premio"**.
2. Pantalla de confirmación que muestra el **nombre completo del cliente** con el texto "Confirma que el cliente es [nombre]" y el premio.
3. Servidor ejecuta `redeem_reward`: resta `stamps_required` del contador (los sellos sobrantes se conservan), suma `total_redemptions`, registra evento `redeem`.
4. Sincroniza Wallet.

### 6.8 Ajuste manual (owner)

Desde `/panel/clientes/[id]`: sumar o restar N sellos con **motivo obligatorio** (ej. "promoción martes doble", "corrección"). El contador nunca baja de 0. Registra evento `manual_adjust` con el delta y la nota. No aplica cooldown.

### 6.9 Deshacer

- Ventana configurable por programa (`undo_window_minutes`, por defecto 5).
- Un cajero solo puede deshacer sellos que él mismo hizo dentro de la ventana. El owner puede deshacer cualquiera de su negocio dentro de la ventana.
- Deshacer no borra el evento: lo marca con `undone_at` y `undone_by` y revierte el contador.
- No se puede deshacer un canje desde la PWA (solo con ajuste manual del owner).

### 6.10 Detección de dispositivo

En el servidor por `User-Agent` y reforzado en cliente:
- iOS (iPhone/iPad, incluido iPadOS que se reporta como Mac con pantalla táctil) → opción Apple.
- Android → opción Google.
- Escritorio/otro → mostrar tarjeta web y un QR para abrir la página en el celular.
- Siempre permitir al usuario elegir manualmente la otra opción ("¿Otro teléfono?").

### 6.11 Navegadores internos (Instagram, Facebook, WhatsApp, TikTok)

Detectar por `User-Agent` (contiene `Instagram`, `FBAN`, `FBAV`, `WhatsApp`, `TikTok`, etc.). En iOS, estos navegadores no abren correctamente los `.pkpass` y pueden fallar con Google Wallet. Mostrar un aviso destacado: "Para agregar tu tarjeta, toca ⋯ y elige *Abrir en Safari*" (o "Abrir en Chrome" en Android), con botón para copiar el enlace.

---

## 7. Seguridad

### 7.1 PIN

- Guardar solo `bcrypt(pin)` con cost 10 o superior. **Nunca guardar ni registrar el PIN en texto plano**, ni en logs ni en auditoría.
- Nadie puede ver el PIN, incluido el super admin.
- Comparación siempre en servidor.

### 7.2 Límite de intentos y bloqueo

- Por cliente: 5 intentos fallidos → bloqueo de 15 minutos (`pin_locked_until`). Contador `pin_failed_attempts` se reinicia al acertar.
- Tras 3 bloqueos acumulados (`pin_lockout_count >= 3`) → bloqueo indefinido hasta que el owner restablezca el PIN. Mensaje: "Por seguridad, contacta al negocio".
- Por IP: límite de intentos de ingreso por ventana de tiempo (ej. 20 por 10 minutos) usando la tabla `rate_limits` para evitar que alguien pruebe muchos teléfonos.
- Respuestas con tiempo similar y mensaje genérico, exista o no el teléfono.

### 7.3 Sesión del cliente

- El cliente no usa Supabase Auth.
- Tras inscribirse o ingresar con PIN, el servidor crea una **cookie httpOnly, Secure, SameSite=Lax**, firmada (JWT HS256 con `CUSTOMER_SESSION_SECRET`), con `card_id`, `business_id` y expiración de 180 días.
- Una cookie por negocio (nombre incluye el id del negocio o el payload contiene una lista).
- Nota: Safari puede borrar datos de sitios no visitados en ~7 días; la cookie es una comodidad, el acceso real es teléfono + PIN.

### 7.4 Enlace personal `/t/[accessToken]`

- `access_token`: aleatorio, mínimo 32 caracteres, URL-safe. Nunca IDs secuenciales.
- Quien tiene el enlace ve la tarjeta. Es equivalente a una credencial: no mostrarlo públicamente ni en logs.
- La tarjeta web **solo permite ver**, nunca modificar sellos.
- Opción de regenerar el token desde el panel del owner si un cliente lo reporta comprometido (invalida el enlace anterior).
- Añadir `<meta name="robots" content="noindex">` y encabezado `Referrer-Policy: no-referrer` en `/t/*`.

### 7.5 Aislamiento multi-tenant

- Toda tabla de negocio lleva `business_id`.
- RLS activado en **todas** las tablas (sección 8.3).
- El rol `anon` no tiene acceso directo a ninguna tabla. Todo lo del cliente final pasa por endpoints del servidor que usan la service role y validan la sesión del cliente.

### 7.6 Auditoría

Registrar en `audit_logs` como mínimo: creación/edición de negocio y programa, alta/baja de usuarios del negocio, ajustes manuales, deshacer, canjes, restablecimiento de PIN, regeneración de enlace, acciones del super admin en modo "ver como" (con `metadata.impersonating = true`).

### 7.7 Otros

- Validar toda entrada con zod.
- Encabezados de seguridad básicos en `next.config` (CSP razonable, `X-Frame-Options`, etc.).
- Secretos solo en variables de entorno de Vercel. `.env.local` en `.gitignore`.
- La clave JSON de la cuenta de servicio de Google se guarda como variable de entorno (contenido en base64), nunca como archivo en el repo.

---

## 8. Base de datos (Supabase / Postgres)

### 8.1 Tipos

```sql
create type staff_role as enum ('super_admin', 'owner', 'cashier');
create type business_status as enum ('trial', 'active', 'suspended');
create type card_status as enum ('active', 'blocked');
create type stamp_event_type as enum ('stamp', 'manual_adjust', 'redeem', 'undo');
```

### 8.2 Tablas

**businesses**
| columna | tipo | notas |
|---|---|---|
| id | uuid pk default gen_random_uuid() | |
| name | text not null | |
| slug | text unique not null | minúsculas, guiones, usado en `/n/[slug]` |
| logo_url | text | URL pública (Supabase Storage, bucket público `logos`) |
| primary_color | text not null default '#111827' | hex |
| text_color | text not null default '#FFFFFF' | hex |
| default_country | text not null default 'CL' | código ISO para normalizar teléfonos (ajustar al país) |
| timezone | text not null default 'America/Santiago' | ajustar al país |
| contact_whatsapp | text | opcional, para "Olvidé mi PIN" |
| status | business_status not null default 'trial' | |
| created_at, updated_at | timestamptz | |

**programs**
| columna | tipo | notas |
|---|---|---|
| id | uuid pk | |
| business_id | uuid fk → businesses not null | |
| card_title | text not null | ej. "Tarjeta Café Luna" |
| stamps_required | int not null check (between 2 and 30) | |
| reward_description | text not null | ej. "Un café gratis" |
| stamp_cooldown_minutes | int not null default 60 | 0 = sin límite |
| undo_window_minutes | int not null default 5 | |
| is_active | boolean not null default true | un solo programa activo por negocio (índice único parcial) |
| google_class_id | text | id de LoyaltyClass en Google |
| design_version | int not null default 1 | se incrementa al cambiar diseño para invalidar caché de imágenes |
| created_at, updated_at | timestamptz | |

**profiles** (usuarios del negocio y super admin; 1:1 con `auth.users`)
| columna | tipo | notas |
|---|---|---|
| id | uuid pk fk → auth.users | |
| full_name | text not null | |
| role | staff_role not null | |
| business_id | uuid fk → businesses | null solo para super_admin (check constraint) |
| is_active | boolean not null default true | desactivar en vez de borrar |
| created_at | timestamptz | |

**customers**
| columna | tipo | notas |
|---|---|---|
| id | uuid pk | |
| business_id | uuid fk not null | |
| full_name | text not null | |
| phone_e164 | text not null | unique (business_id, phone_e164) |
| email | text | opcional |
| pin_hash | text not null | bcrypt |
| pin_must_change | boolean not null default false | true tras restablecer |
| pin_temp_expires_at | timestamptz | vencimiento del PIN temporal |
| pin_failed_attempts | int not null default 0 | |
| pin_locked_until | timestamptz | |
| pin_lockout_count | int not null default 0 | |
| marketing_consent | boolean not null default false | |
| privacy_accepted_at | timestamptz not null | |
| created_at, updated_at | timestamptz | |

**cards**
| columna | tipo | notas |
|---|---|---|
| id | uuid pk | |
| business_id | uuid fk not null | |
| program_id | uuid fk not null | |
| customer_id | uuid fk not null | unique (customer_id, program_id) |
| public_code | text unique not null | aleatorio ~16 chars, va dentro del QR |
| access_token | text unique not null | aleatorio ≥32 chars, va en el enlace `/t/...` |
| stamps_count | int not null default 0 check (>= 0) | |
| total_stamps | int not null default 0 | histórico |
| total_redemptions | int not null default 0 | |
| last_stamp_at | timestamptz | para cooldown |
| status | card_status not null default 'active' | |
| google_object_id | text | |
| google_saved | boolean not null default false | se marca si el usuario lo agregó (si se puede detectar) |
| apple_serial_number | text unique | futuro |
| apple_auth_token | text | futuro, ≥16 chars |
| wallet_sync_error | text | último error de sincronización |
| wallet_synced_at | timestamptz | |
| updated_at | timestamptz not null | **se actualiza en cada cambio**; Apple lo usa para `passesUpdatedSince` |
| created_at | timestamptz | |

**stamp_events**
| columna | tipo | notas |
|---|---|---|
| id | uuid pk | |
| business_id | uuid fk not null | |
| card_id | uuid fk not null | |
| type | stamp_event_type not null | |
| delta | int not null | +1 sello, −N canje, ±N ajuste |
| stamps_after | int not null | contador resultante |
| performed_by | uuid fk → profiles | |
| note | text | obligatorio en `manual_adjust` |
| undone_at | timestamptz | |
| undone_by | uuid fk → profiles | |
| created_at | timestamptz | |

**audit_logs**
| columna | tipo | notas |
|---|---|---|
| id | uuid pk | |
| business_id | uuid | null para acciones globales |
| actor_id | uuid | profile que actuó (null si fue el cliente o el sistema) |
| action | text not null | ej. `pin.reset`, `card.redeem`, `program.update` |
| entity_type | text | |
| entity_id | uuid | |
| metadata | jsonb | nunca incluir PIN ni tokens |
| created_at | timestamptz | |

**rate_limits**
| columna | tipo | notas |
|---|---|---|
| key | text pk | ej. `login_ip:1.2.3.4` |
| count | int not null | |
| window_start | timestamptz not null | |

**apple_device_registrations** (futuro, crear la tabla desde ya)
| columna | tipo | notas |
|---|---|---|
| id | uuid pk | |
| device_library_identifier | text not null | |
| push_token | text not null | |
| pass_type_identifier | text not null | |
| serial_number | text not null | |
| created_at | timestamptz | |
| | | unique (device_library_identifier, pass_type_identifier, serial_number) |

Índices: `customers(business_id, phone_e164)`, `cards(public_code)`, `cards(access_token)`, `stamp_events(card_id, created_at desc)`, `stamp_events(business_id, created_at desc)`, `audit_logs(business_id, created_at desc)`, índice trigram o `ilike` sobre `customers.full_name` para búsqueda.

Trigger `updated_at` en todas las tablas que lo tengan.

### 8.3 Row Level Security

Funciones auxiliares (`security definer`, `stable`):
- `auth_role()` → rol del usuario actual desde `profiles`, solo si `is_active`.
- `auth_business_id()` → negocio del usuario actual.
- `is_super_admin()` → booleano.

Políticas:
- **businesses:** super_admin todo; owner/cashier `select` de su propio negocio; owner `update` de campos de marca de su negocio (no `status`).
- **programs:** super_admin todo; owner select/update del suyo; cashier select del suyo.
- **profiles:** cada usuario ve su propio perfil; owner ve y gestiona los perfiles de su negocio (solo rol `cashier`); super_admin todo. Nadie puede auto-promoverse de rol.
- **customers:** super_admin todo; owner select/update de su negocio; cashier select limitado de su negocio (idealmente vía vista `customers_for_cashier` sin email). **Ninguna política expone `pin_hash`**: excluirlo mediante vistas o `column privileges`.
- **cards:** super_admin todo; owner/cashier select de su negocio. Las escrituras solo mediante funciones (8.4).
- **stamp_events:** select por negocio; insert solo mediante funciones.
- **audit_logs:** super_admin todo; owner select de su negocio; nadie update/delete.
- **rate_limits, apple_device_registrations:** sin acceso para `authenticated` ni `anon`; solo service role.
- `anon`: sin políticas en ninguna tabla.

Escribir tests de RLS (script SQL o Vitest contra Supabase local) que verifiquen que un owner del negocio A no puede leer nada del negocio B.

### 8.4 Funciones de base de datos (transaccionales)

Todas `security definer`, validan rol y negocio del llamante con las funciones auxiliares, bloquean la fila de la tarjeta con `select ... for update` para evitar condiciones de carrera, y escriben el evento y la auditoría en la misma transacción.

- `add_stamp(p_public_code text)` → valida cooldown, suma 1, actualiza `last_stamp_at`, `total_stamps`, `updated_at`, inserta `stamp_events(type='stamp')`. Devuelve estado de la tarjeta.
- `redeem_reward(p_card_id uuid)` → valida `stamps_count >= stamps_required`, resta, suma `total_redemptions`, inserta evento `redeem`.
- `manual_adjust(p_card_id uuid, p_delta int, p_note text)` → solo owner/super_admin, nota obligatoria, no baja de 0.
- `undo_stamp_event(p_event_id uuid)` → valida ventana y permisos (cajero solo sus propios sellos), revierte y marca `undone_at`.

Las operaciones del cliente final (inscripción, login con PIN, reset de PIN con hash bcrypt) se hacen en Route Handlers de Next.js con la service role, porque bcrypt se calcula en Node.

---

## 9. Formato del QR de la tarjeta

- Contenido: `LC1:<public_code>` (prefijo con versión para poder cambiar el formato en el futuro).
- El escáner rechaza cualquier QR que no tenga ese formato con el mensaje "Este código no es una tarjeta válida".
- El `public_code` no da acceso a ver la tarjeta sin sesión de staff; solo sirve para que el cajero la identifique.
- En Google Wallet y Apple Wallet se usa el mismo valor como código de barras tipo QR.

---

## 10. Módulo de Wallet (arquitectura de proveedores)

Ubicación: `src/lib/wallet/`.

```ts
// src/lib/wallet/types.ts
export interface WalletCardData {
  cardId: string;
  businessName: string;
  cardTitle: string;
  customerName: string;
  stampsCount: number;
  stampsRequired: number;
  rewardDescription: string;
  rewardAvailable: boolean;
  qrValue: string;           // "LC1:<public_code>"
  logoUrl: string;
  primaryColor: string;
  textColor: string;
  stampsImageUrl: string;    // imagen dinámica de sellos
  webCardUrl: string;        // enlace a /t/[accessToken]
}

export interface WalletProvider {
  readonly id: 'google' | 'apple';
  isEnabled(): boolean;
  ensureProgram(programId: string): Promise<void>;        // crea/actualiza la clase del negocio
  createCard(data: WalletCardData): Promise<void>;         // crea el objeto/pase
  getAddToWalletUrl(data: WalletCardData): Promise<string>;// enlace del botón "Agregar"
  syncCard(data: WalletCardData, message?: string): Promise<void>; // actualiza tras un cambio
}
```

- `src/lib/wallet/google.ts` → implementación completa.
- `src/lib/wallet/apple.ts` → **stub** que implementa la interfaz, con `isEnabled()` devolviendo `process.env.APPLE_WALLET_ENABLED === 'true'` y métodos que lanzan `NotImplementedError` con comentarios `TODO(apple)` describiendo lo que falta (ver sección 12).
- `src/lib/wallet/index.ts` → `syncCardEverywhere(cardId, message?)`: carga los datos, llama a `syncCard` de cada proveedor habilitado, **no lanza error hacia el flujo de sellos**: si falla, guarda `wallet_sync_error` y registra en consola. El sello ya quedó guardado en la base de datos, que es la fuente de verdad.
- Llamar a `syncCardEverywhere` después de `add_stamp`, `redeem_reward`, `manual_adjust`, `undo_stamp_event` y cambios de diseño del programa (en este último caso, a todas las tarjetas del programa, por lotes).

### 10.1 Imagen dinámica de sellos

- Endpoint `GET /api/img/stamps/[programId]/[count]?v=[design_version]` con `@vercel/og`.
- Dibuja `stamps_required` círculos, `count` llenos con el color del negocio, el resto vacíos. Si hay premio disponible, un indicador de premio.
- Tamaño recomendado apto para la imagen "hero" de Google (relación ancha, ej. 1032×336) y reutilizable como "strip" de Apple.
- Encabezado `Cache-Control: public, max-age=31536000, immutable` (la URL cambia con el conteo y la versión, así que es seguro).
- Debe ser accesible públicamente por HTTPS (Google la descarga).

---

## 11. Google Wallet — implementación

### 11.1 Conceptos

- **Issuer ID:** identificador de la plataforma (uno solo para todos los negocios).
- **LoyaltyClass:** una por negocio/programa. ID: `${GOOGLE_WALLET_ISSUER_ID}.program_${programId sin guiones}`.
- **LoyaltyObject:** una por tarjeta. ID: `${GOOGLE_WALLET_ISSUER_ID}.card_${cardId sin guiones}`.
- Los IDs solo admiten letras, números, `.`, `_` y `-`.

### 11.2 Autenticación

- Cuenta de servicio de Google Cloud con la Wallet API habilitada, agregada como usuario en la Google Pay & Wallet Console.
- Scope: `https://www.googleapis.com/auth/wallet_object.issuer`.
- Credencial en `GOOGLE_WALLET_SERVICE_ACCOUNT_JSON_BASE64`.
- Base REST: `https://walletobjects.googleapis.com/walletobjects/v1/`.

### 11.3 LoyaltyClass (por programa)

Campos principales: `id`, `issuerName` (nombre de la plataforma o del negocio), `programName` (card_title), `programLogo` (logo del negocio, URL pública), `hexBackgroundColor` (primary_color), `reviewStatus: "UNDER_REVIEW"`, `localizedIssuerName`/`localizedProgramName` si aplica. Crear con `POST loyaltyClass`; si existe (409), actualizar con `PATCH`.

### 11.4 LoyaltyObject (por tarjeta)

Campos principales:
- `id`, `classId`, `state: "ACTIVE"`
- `accountName`: nombre del cliente
- `accountId`: `public_code`
- `loyaltyPoints`: `{ label: "Sellos", balance: { string: "7 / 10" } }`
- `barcode`: `{ type: "QR_CODE", value: "LC1:<public_code>" }`
- `heroImage`: imagen dinámica de sellos
- `textModulesData`: premio ("Premio: Un café gratis")
- `linksModuleData`: enlace a la tarjeta web

### 11.5 Botón "Agregar a Google Wallet"

- Generar un JWT firmado con RS256 usando la clave privada de la cuenta de servicio:
  - `iss`: email de la cuenta de servicio
  - `aud`: `"google"`
  - `typ`: `"savetowallet"`
  - `origins`: dominios del sitio
  - `payload`: `{ loyaltyObjects: [ { id: objectId } ] }` (el objeto se crea antes por REST)
- URL: `https://pay.google.com/gp/v/save/<jwt>`
- Usar el botón oficial de Google Wallet según sus lineamientos de marca.

### 11.6 Actualizaciones

- Tras cada cambio: `PATCH loyaltyObject/{id}` con `loyaltyPoints`, `heroImage`.
- Para notificar al cliente (ej. "¡Te falta 1 sello!" o "¡Premio disponible!"): `POST loyaltyObject/{id}/addMessage`. Google limita la cantidad de notificaciones por pase, así que solo usar mensajes en momentos clave (falta 1 sello, premio disponible), no en cada sello.

### 11.7 Modo demo

Mientras la cuenta no tenga acceso de producción, solo las cuentas de prueba registradas en la consola pueden guardar pases. Mostrar este estado en el panel de super admin con una variable `GOOGLE_WALLET_MODE=demo|production`.

---

## 12. Apple Wallet — diseño para implementación futura

**No implementar ahora más allá del stub, la tabla y las rutas vacías.** Documentado para cuando exista la cuenta de Apple Developer.

Requisitos futuros: Pass Type ID (ej. `pass.com.tumarca.loyalty`), certificado de firma del Pass Type ID (.p12 → PEM), certificado WWDR de Apple, Team ID, clave APNs `.p8` con Key ID.

Pase estilo `storeCard` con `passkit-generator`: logo, `strip` = imagen dinámica de sellos, campo principal sellos, secundario nombre del cliente, `barcodes` QR con `LC1:<public_code>`, `webServiceURL` = `https://<dominio>/api/apple`, `authenticationToken` = `cards.apple_auth_token`, `serialNumber` = `cards.apple_serial_number`, colores del negocio. Campos con `changeMessage` para notificación en pantalla de bloqueo.

Endpoints del Web Service de Apple (bajo `/api/apple`, autenticación con encabezado `Authorization: ApplePass <authenticationToken>`):
- `POST /v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}/{serialNumber}` → registra dispositivo (body `{ pushToken }`), 201 nuevo / 200 existente.
- `DELETE /v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}/{serialNumber}` → elimina registro.
- `GET /v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}?passesUpdatedSince=<tag>` → lista de seriales actualizados desde `tag` (usar `cards.updated_at` como marca), 204 si no hay.
- `GET /v1/passes/{passTypeIdentifier}/{serialNumber}` → devuelve el `.pkpass` actualizado, soporta `If-Modified-Since`.
- `POST /v1/log` → registra errores enviados por los dispositivos.

Push: tras cada cambio, enviar notificación APNs vacía (`{}`) al `push_token` de cada registro de esa tarjeta, con topic = Pass Type ID, por HTTP/2 con JWT firmado con la clave `.p8` (runtime Node, no Edge).

Descarga: `GET /api/apple/pass/[accessToken]` devuelve el `.pkpass` con `Content-Type: application/vnd.apple.pkpass`.

---

## 13. PWA del cajero

- Ruta `/escaner` (y subrutas), con `manifest.webmanifest` propio: `name`, `short_name`, `start_url: "/escaner"`, `display: "standalone"`, íconos 192 y 512, colores.
- Service worker mínimo (cache del shell de la app). No cachear respuestas de API.
- Pantalla de ayuda para instalar: Android (menú → Instalar app) e iOS (Compartir → Añadir a pantalla de inicio).
- Escáner con `html5-qrcode`, cámara trasera por defecto, botón de linterna si el dispositivo lo soporta.
- iOS puede volver a pedir permiso de cámara al reabrir la app: mostrar un mensaje amable si el permiso es denegado, con instrucciones.
- Interfaz de botones grandes, pensada para usarse rápido con una mano.
- Feedback claro: vibración (si está disponible) y colores de éxito/error.
- Requiere conexión. Si no hay conexión, mostrar "Sin conexión, no se pueden sumar sellos" (no encolar sellos offline en esta versión).
- Sesión del cajero persistente (no pedir login cada vez).

---

## 14. Estructura de rutas (Next.js App Router)

```
src/app/
  page.tsx                         # landing de la plataforma (marketing básico)
  login/                           # login de staff (super_admin, owner, cashier)
  privacidad/                      # política de privacidad
  terminos/                        # términos de uso

  admin/                           # solo super_admin
    page.tsx                       # dashboard global
    negocios/page.tsx              # lista de negocios
    negocios/nuevo/page.tsx
    negocios/[id]/page.tsx         # detalle, editar, suspender, botón "Entrar como"
    auditoria/page.tsx

  panel/                           # owner (y super_admin en modo "ver como")
    page.tsx                       # resumen: clientes, sellos del día/semana, canjes
    clientes/page.tsx              # búsqueda y lista
    clientes/[id]/page.tsx         # detalle, historial, ajuste manual, restablecer PIN, regenerar enlace
    programa/page.tsx              # sellos, premio, cooldown, diseño con vista previa
    equipo/page.tsx                # cajeros: invitar, desactivar
    actividad/page.tsx             # historial de eventos del negocio
    compartir/page.tsx             # QR descargable/imprimible del enlace de inscripción

  escaner/                         # PWA del cajero (owner también puede usarla)
    page.tsx                       # escáner
    buscar/page.tsx                # búsqueda manual por teléfono/nombre
    tarjeta/[publicCode]/page.tsx  # confirmación: +1 sello / canjear / deshacer

  n/[slug]/                        # público: inscripción y reingreso del cliente
    page.tsx
    ingresar/page.tsx              # teléfono + PIN
    nuevo-pin/page.tsx             # cambio obligatorio tras PIN temporal

  t/[accessToken]/page.tsx         # tarjeta web del cliente

  api/
    customers/register/route.ts
    customers/login/route.ts
    customers/change-pin/route.ts
    staff/cards/[publicCode]/route.ts        # resumen para el cajero
    staff/cards/[cardId]/stamp/route.ts      # llama a add_stamp
    staff/cards/[cardId]/redeem/route.ts
    staff/cards/[cardId]/adjust/route.ts
    staff/events/[eventId]/undo/route.ts
    staff/customers/[id]/reset-pin/route.ts  # solo owner/super_admin
    staff/customers/[id]/regenerate-link/route.ts
    wallet/google/save/[accessToken]/route.ts  # redirige a la URL de Google con JWT
    img/stamps/[programId]/[count]/route.tsx
    apple/...                                 # stubs (sección 12)
```

- Middleware (`middleware.ts`): refresca la sesión de Supabase y protege `/admin`, `/panel`, `/escaner` según rol. `/n/*`, `/t/*` y `/api/customers/*` son públicos (con sus propias validaciones).
- **Modo "ver como":** el super_admin elige un negocio en `/admin/negocios/[id]`; se guarda una cookie httpOnly `acting_business_id`, validada en servidor solo si el usuario es super_admin. `/panel` y `/escaner` usan ese negocio y muestran un banner fijo "Estás viendo como [negocio] — Salir". Acciones registradas en auditoría con `impersonating: true`.

---

## 15. Variables de entorno

```bash
# App
NEXT_PUBLIC_APP_URL=https://<proyecto>.vercel.app
CUSTOMER_SESSION_SECRET=            # string aleatorio largo

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # solo servidor

# Email
RESEND_API_KEY=
EMAIL_FROM=

# Google Wallet
GOOGLE_WALLET_ISSUER_ID=
GOOGLE_WALLET_SERVICE_ACCOUNT_JSON_BASE64=
GOOGLE_WALLET_MODE=demo             # demo | production

# Apple Wallet (futuro)
APPLE_WALLET_ENABLED=false
APPLE_PASS_TYPE_ID=
APPLE_TEAM_ID=
APPLE_PASS_CERT_PEM_BASE64=
APPLE_PASS_KEY_PEM_BASE64=
APPLE_PASS_KEY_PASSPHRASE=
APPLE_WWDR_CERT_PEM_BASE64=
APPLE_APNS_KEY_ID=
APPLE_APNS_KEY_P8_BASE64=
```

Incluir un `.env.example` con todas las claves vacías.

---

## 16. Privacidad y legal (mínimo requerido)

- Páginas `/privacidad` y `/terminos` con texto base editable (qué datos se recogen: nombre, teléfono, email opcional; para qué; cuánto tiempo; cómo pedir su eliminación; quién es el responsable). Google las exige para aprobar producción.
- Casilla de aceptación obligatoria en la inscripción; guardar `privacy_accepted_at`.
- Consentimiento de marketing separado y opcional.
- Función para que el owner o super_admin elimine un cliente a pedido (borrar datos personales, conservar eventos anonimizados para estadísticas).
- Ajustar el texto legal al país de operación (pendiente de definir).

---

## 17. Plan de desarrollo por fases

Trabajar **una tarea a la vez**, con commit al terminar cada una. Cada fase tiene criterios de aceptación.

### Fase 1 — Base del proyecto
1. Crear proyecto Next.js + TypeScript + Tailwind + shadcn/ui + ESLint + Prettier + Vitest.
2. Configurar Supabase CLI y entorno local; clientes de Supabase para servidor, navegador y middleware.
3. Migración inicial: tipos, todas las tablas de la sección 8, índices, triggers `updated_at`.
4. Funciones auxiliares de RLS y políticas de todas las tablas.
5. Tests de aislamiento RLS entre dos negocios.
6. Script `seed` con: 1 super_admin, 2 negocios de prueba, 1 owner y 1 cajero por negocio, programas y clientes de ejemplo.
7. `.env.example`, README con instrucciones de arranque.

**Aceptación:** migraciones aplican limpio; los tests de RLS pasan; el seed carga datos.

### Fase 2 — Autenticación de staff y estructura
1. Página `/login` con Supabase Auth (email + contraseña).
2. Middleware de protección por rol y redirección según rol tras login.
3. Layouts base de `/admin`, `/panel`, `/escaner`.
4. Modo "ver como" del super_admin con banner y auditoría.

**Aceptación:** cada rol solo entra a lo suyo; un cajero no puede abrir `/panel` ni `/admin`.

### Fase 3 — Cliente final: inscripción, tarjeta web y PIN
1. `/n/[slug]` con marca del negocio, detección de dispositivo y de navegador interno.
2. Registro con validaciones, anti-duplicado por teléfono y PIN hasheado.
3. Sesión del cliente por cookie firmada.
4. `/t/[accessToken]`: tarjeta web con nombre, logo, colores, sellos (imagen dinámica), QR y premio.
5. Imagen dinámica de sellos (`/api/img/stamps/...`).
6. Reingreso con teléfono + PIN, límite de intentos, bloqueos y rate limit por IP.
7. Flujo de cambio obligatorio de PIN temporal.
8. Tests unitarios de: validación de PIN, normalización de teléfono, lógica de bloqueo.

**Aceptación:** un cliente puede inscribirse, ver su tarjeta, cerrar el navegador y volver con teléfono + PIN; 5 intentos fallidos bloquean.

### Fase 4 — PWA del cajero y lógica de sellos
1. Funciones Postgres `add_stamp`, `redeem_reward`, `manual_adjust`, `undo_stamp_event` con tests.
2. Manifest y service worker de `/escaner`; pantalla de ayuda de instalación.
3. Escáner con `html5-qrcode`, validación del formato `LC1:`.
4. Pantalla de confirmación: +1 sello, canjear (con confirmación de nombre), deshacer.
5. Búsqueda manual por teléfono/nombre.

**Aceptación:** desde un celular real (Android y iPhone), el cajero escanea la tarjeta web de un cliente, suma un sello y la tarjeta web muestra el nuevo conteo al recargar; cooldown y deshacer funcionan; un cajero no puede sellar tarjetas de otro negocio.

### Fase 5 — Google Wallet (modo demo)
1. Módulo `src/lib/wallet/` con interfaz, proveedor Google y stub de Apple.
2. Crear/actualizar LoyaltyClass al crear o editar un programa.
3. Crear LoyaltyObject al inscribir cliente; botón "Agregar a Google Wallet" con JWT.
4. `syncCardEverywhere` tras cada cambio de sellos; guardar errores sin romper el flujo.
5. Mensajes en momentos clave (falta 1 sello, premio disponible).

**Aceptación:** con una cuenta de prueba de Google, el cliente agrega la tarjeta a Google Wallet y, al sumar un sello en la PWA, la tarjeta se actualiza sola en el teléfono.

### Fase 6 — Panel del dueño
1. Resumen con métricas básicas (clientes totales, sellos hoy/semana, canjes).
2. Clientes: lista, búsqueda, detalle con historial, ajuste manual con motivo, restablecer PIN (muestra el temporal una sola vez), regenerar enlace, eliminar cliente.
3. Programa: editar sellos, premio, cooldown, logo, colores, con vista previa de la tarjeta; al guardar, incrementar `design_version` y sincronizar Wallet por lotes.
4. Equipo: invitar cajeros por email, desactivar.
5. Actividad: historial de eventos filtrable.
6. Compartir: QR del enlace de inscripción descargable en PNG y versión imprimible.

**Aceptación:** un owner puede operar su negocio completo sin ayuda del super admin.

### Fase 7 — Panel de super admin
1. Lista y alta de negocios (crea negocio, programa, invita owner, crea clase de Google).
2. Detalle: editar, suspender (una tarjeta de negocio suspendido no acepta sellos y muestra aviso), entrar como.
3. Dashboard global y vista de auditoría.
4. Indicador del modo de Google Wallet (demo/producción) y errores de sincronización recientes.

### Fase 8 — Preparación para piloto
1. Páginas de privacidad y términos.
2. SMTP propio con Resend en Supabase Auth.
3. Dominio propio conectado a Vercel.
4. Revisión de seguridad: encabezados, RLS, secretos, rate limits.
5. Solicitud de acceso a producción de Google Wallet.

### Fases posteriores (fuera de alcance por ahora)
- Apple Wallet (sección 12).
- Cobro de suscripciones a negocios (Stripe o Mercado Pago).
- Múltiples sucursales por negocio.
- Promociones y mensajes masivos.
- Premio de cumpleaños.
- QR dinámico para auto-sellado controlado.
- Recuperación por SMS/WhatsApp.
- Reportes avanzados y exportación.

---

## 18. Decisiones tomadas (no reabrir sin preguntar)

1. Una sola app Next.js para todos los roles.
2. El cliente se identifica con **teléfono + PIN de 4 dígitos**; sin cuenta, sin contraseña.
3. PIN guardado con hash; **nadie puede verlo**. El owner lo **restablece** con un PIN temporal que el cliente debe cambiar.
4. Solo owner y super_admin restablecen PIN.
5. Bloqueo: 5 intentos → 15 min; 3 bloqueos → contactar al negocio.
6. El cajero escanea el QR del cliente; el cliente nunca se auto-sella.
7. Confirmación explícita antes de sumar y nombre visible al canjear.
8. Tarjeta web siempre disponible; Wallet como extra sobre la misma tarjeta.
9. Google Wallet primero (demo); Apple después, detrás de un feature flag.
10. Supabase Free + Vercel Hobby al inicio.

## 19. Pendientes por definir

- País de operación (afecta teléfono por defecto, zona horaria, texto legal y pasarela de pago).
- Nombre de la marca y dominio.
- Precio para los negocios.
