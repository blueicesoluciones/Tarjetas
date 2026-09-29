# Sellos — tarjetas de fidelidad digitales

Plataforma SaaS multi-negocio de tarjetas de sellos (web + Google Wallet; Apple Wallet más adelante).
La especificación completa está en [`Planteamiento.md`](./Planteamiento.md) (fuente de verdad del proyecto).

**Stack:** Next.js 16 (App Router, `src/proxy.ts`) · TypeScript estricto · Tailwind 4 · shadcn/ui (Base UI) ·
Supabase (Postgres + Auth + Storage) · Vitest · Vercel.

## Arranque local

Requisitos: Node 20+ (probado con 24), Docker Desktop (para Supabase local).

```bash
npm install
cp .env.example .env.local

# Supabase local (Postgres, Auth, Storage) — aplica migraciones y seed
npm run db:start          # imprime API URL, anon key y service_role key
npm run db:reset          # re-aplica supabase/migrations + supabase/seed.sql
```

Completa `.env.local` con los valores que imprime `supabase start` (o `npx supabase status`)
(`NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`, anon key, service role key) y genera el secreto de sesión:

```bash
openssl rand -base64 48   # → CUSTOMER_SESSION_SECRET
npm run dev
```

Servicios locales: app `http://localhost:3000`, Supabase Studio `http://127.0.0.1:54323`.
Para probar el escáner con la cámara desde tu celular en la misma red usa HTTPS
(`npx next dev --experimental-https`), porque los navegadores solo dan acceso a la cámara en HTTPS o localhost.

### Usuarios de prueba (seed)

Contraseña de staff: `Password123!` · PIN de clientes: `2580`

| Rol | Email | Negocio |
|---|---|---|
| super_admin | admin@tarjetas.test | — |
| owner | owner@cafeluna.test | Café Luna (`/n/cafe-luna`) |
| cashier | cajero@cafeluna.test | Café Luna |
| owner | owner@barberiasol.test | Barbería Sol (`/n/barberia-sol`) |
| cashier | cajero@barberiasol.test | Barbería Sol |

Clientes: Camila Rojas `+56912345601` (en ambos negocios), Diego Muñoz `+56912345602` (Café Luna, premio disponible).
Tarjeta web de ejemplo: `/t/demo-token-cafe-luna-camila-000000000001`.

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm test` | Tests unitarios (Vitest) |
| `npm run typecheck` | Genera tipos de rutas y corre `tsc` |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Prueba de humo en Chrome (requiere `npm run dev` y la base con seed) |
| `npm run db:test` | Tests pgTAP de RLS y funciones de sellos (`supabase/tests`) |
| `npm run db:reset` | Recrea la base local con migraciones y seed |
| `npm run db:push` | Aplica migraciones al proyecto remoto enlazado |
| `npm run db:types` | Genera tipos TS desde la base local |

## Estructura

```
supabase/
  migrations/     esquema, RLS + privilegios por columna, funciones de sellos, bucket de logos
  tests/          pgTAP: aislamiento entre negocios y reglas de sellos
  seed.sql        datos de prueba
src/
  proxy.ts        refresco de sesión de Supabase y redirección a /login en rutas de staff
  app/
    admin/        super admin: negocios, auditoría, "entrar como"
    panel/        dueño: clientes, programa, equipo, actividad, compartir
    escaner/      PWA del cajero (manifest, service worker, escáner QR)
    n/[slug]/     inscripción e ingreso del cliente (teléfono + PIN)
    t/[token]/    tarjeta web del cliente
    api/          customers/*, staff/*, img/*, wallet/google/*, apple/* (stubs)
  lib/
    domain/       lógica pura con tests: PIN, teléfono, bloqueo, QR, tokens, dispositivo
    customers/    inscripción, ingreso, cambio y reseteo de PIN (servidor, bcrypt)
    stamps/       llamadas a las funciones Postgres y traducción de errores
    wallet/       proveedores Google (completo) y Apple (stub) + syncCardEverywhere
    auth/         contexto de staff, roles y modo "ver como"
```

## Decisiones de implementación (complementan Planteamiento.md)

- **Next.js 16** renombró `middleware.ts` a `proxy.ts`. El proxy solo hace una verificación optimista (¿hay sesión?);
  el rol se valida en cada layout con `requireStaff` y en cada API con `staffForApi`, y de forma definitiva en Postgres.
- **pin_hash, access_token y apple_auth_token no son legibles por `authenticated`** (privilegios por columna).
  El cajero no lee `customers`: usa las funciones `staff_card_summary` y `staff_search_customers`.
- Las escrituras de super admin (alta de negocio, cambio de `status`, alta de staff) se hacen con service role en
  el servidor después de verificar el rol, porque `authenticated` no tiene permisos de insert en esas tablas.
- Deshacer solo aplica a eventos `stamp`, dentro de la ventana, y **solo si es el último movimiento de la tarjeta**
  (evita revertir un sello anterior a un canje).
- Eliminar un cliente anonimiza sus datos (`deleted_at`, nombre genérico, teléfono reemplazado), bloquea la tarjeta
  y conserva los eventos para estadísticas. Se agregó la columna `customers.deleted_at`.
- **No se envían correos.** El super admin crea dueños y cajeros con email y contraseña
  (`auth.admin.createUser`, `src/lib/staff-users.ts`) y puede cambiar contraseñas y desactivar usuarios
  desde `/admin/negocios/[id]`. Ahí también ve los clientes y tarjetas del negocio («Gestionar» abre la ficha en modo ver como).
- Restablecer PIN: el dueño puede escribir el PIN temporal (opcional) o dejar que se genere uno.
- Rutas de staff de tarjetas: `/api/staff/cards/[cardRef]` donde `cardRef` es el `public_code` (GET y `stamp`)
  o el id de la tarjeta (`redeem`, `adjust`). Next no permite dos nombres de segmento dinámico distintos en el mismo nivel.

## Deploy (Vercel + Supabase)

1. Crear proyecto en Supabase (plan Free) → `npx supabase link --project-ref <ref>` → `npm run db:push`.
2. Crear el primer super admin: en Supabase → Authentication → Add user, y luego en SQL editor:
   `insert into profiles (id, full_name, role) values ('<uuid del usuario>', 'Tu nombre', 'super_admin');`
3. En Supabase → Authentication → URL Configuration: `Site URL = https://<proyecto>.vercel.app` y agregar
   `https://<proyecto>.vercel.app/**` a Redirect URLs.
4. Importar el repo en Vercel y cargar las variables de `.env.example` (Production y Preview).
   `SUPABASE_SERVICE_ROLE_KEY` y `CUSTOMER_SESSION_SECRET` solo como variables de servidor (sin `NEXT_PUBLIC_`).
5. Google Wallet (modo demo): cuenta de servicio con Wallet API → JSON en base64
   (`base64 -i key.json | pbcopy`) en `GOOGLE_WALLET_SERVICE_ACCOUNT_JSON_BASE64`, e `GOOGLE_WALLET_ISSUER_ID`.
   Agregar cuentas de prueba en la Google Pay & Wallet Console.

Ver advertencias de los planes gratuitos en `Planteamiento.md` §2.
