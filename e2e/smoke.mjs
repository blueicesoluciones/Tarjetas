// Prueba de humo end-to-end contra el entorno local (npm run dev + supabase start + seed).
// Usa el Chrome instalado en el sistema: npm run test:e2e
// Recorre: inscripción de cliente → tarjeta web → cajero busca y suma sello →
// dueño recorre el panel → super admin crea negocio → el dueño acepta la invitación.
import { chromium, devices } from "playwright-core";

const B = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const run = Date.now().toString().slice(-6);
const errors = [];
let step = 0;

function ok(msg) {
  console.log(`✓ ${++step}. ${msg}`);
}
function watch(page, label) {
  page.on("pageerror", (e) => errors.push(`${label}: ${e.message}`));
}
async function login(page, email, password = "Password123!") {
  await page.goto(`${B}/login`);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.locator("main button[type=submit]").click();
}
function expect(cond, msg) {
  if (!cond) throw new Error(`Falló: ${msg}`);
}

const browser = await chromium.launch({ channel: "chrome", headless: process.env.HEADED !== "1" });
try {
  // 1. Cliente se inscribe desde un iPhone
  const customer = await (await browser.newContext({ ...devices["iPhone 13"] })).newPage();
  watch(customer, "cliente");
  await customer.goto(`${B}/n/cafe-luna`);
  const name = `Cliente E2E ${run}`;
  await customer.fill("#fullName", name);
  await customer.fill("#phone", `9 7${run.slice(0, 3)} ${run.slice(3)}0`);
  await customer.fill("#pin", "1234");
  await customer.fill("#pinConfirm", "1234");
  await customer.locator("main button[type=submit]").click();
  await customer.getByText("muy fácil de adivinar").waitFor();
  ok("rechaza PIN trivial");
  await customer.fill("#pin", "3141");
  await customer.fill("#pinConfirm", "3141");
  await customer.check("input[name=privacyAccepted]");
  await customer.locator("main button[type=submit]").click();
  await customer.waitForURL(/\/t\//);
  await customer.getByText(name).waitFor();
  ok("cliente inscrito y ve su tarjeta web");

  // 2. Cajero busca al cliente y suma un sello
  const cashier = await (await browser.newContext({ ...devices["Pixel 7"] })).newPage();
  watch(cashier, "cajero");
  await login(cashier, "cajero@cafeluna.test");
  await cashier.waitForURL(/\/escaner/);
  await cashier.goto(`${B}/escaner/buscar`);
  await cashier.fill("input[type=search]", name);
  await cashier.getByText(name).click();
  await cashier.waitForURL(/\/escaner\/tarjeta\//);
  await cashier.getByText("+1 sello").click();
  await cashier.getByText("1 de 10 sellos").waitFor();
  ok("cajero suma un sello");
  await cashier.getByText("+1 sello").click();
  await cashier.getByText("ya recibió un sello").waitFor();
  ok("cooldown impide doble sello");
  await cashier.goto(`${B}/panel`);
  expect(cashier.url().includes("/escaner"), "el cajero no puede abrir /panel");
  ok("cajero no entra a /panel");

  // 3. La tarjeta web refleja el sello
  await customer.reload();
  await customer.getByText("Te faltan 9").waitFor();
  ok("tarjeta web muestra el nuevo conteo");

  // 4. Dueño recorre el panel
  const owner = await (await browser.newContext()).newPage();
  watch(owner, "dueño");
  await login(owner, "owner@cafeluna.test");
  await owner.waitForURL(/\/panel/);
  for (const path of ["/panel", "/panel/clientes", "/panel/programa", "/panel/equipo", "/panel/actividad", "/panel/compartir"]) {
    const res = await owner.goto(B + path);
    expect(res?.status() === 200, `${path} responde 200`);
  }
  await owner.goto(`${B}/admin`);
  expect(!owner.url().includes("/admin"), "el dueño no puede abrir /admin");
  ok("dueño recorre el panel y no entra a /admin");

  // 5. Super admin crea un negocio e invita al dueño
  const admin = await (await browser.newContext()).newPage();
  watch(admin, "admin");
  await login(admin, "admin@tarjetas.test");
  await admin.waitForURL(/\/admin/);
  await admin.goto(`${B}/admin/negocios/nuevo`);
  await admin.fill("[name=name]", `Negocio E2E ${run}`);
  await admin.fill("[name=card_title]", "Club E2E");
  await admin.fill("[name=stamps_required]", "8");
  await admin.fill("[name=reward_description]", "Premio de prueba");
  await admin.fill("[name=owner_name]", "Dueño E2E");
  await admin.fill("[name=owner_email]", `owner-${run}@e2e.test`);
  await admin.locator("main button[type=submit]").last().click();
  const link = await admin.locator("code").first().textContent({ timeout: 15000 });
  expect(link?.includes("/auth/confirm"), "se genera enlace de invitación");
  ok("super admin crea negocio e invitación");

  // 6. El nuevo dueño acepta la invitación
  const invited = await (await browser.newContext()).newPage();
  watch(invited, "invitado");
  await invited.goto(link);
  await invited.waitForURL(/definir-clave/);
  await invited.fill("#password", "ClaveSegura1");
  await invited.fill("#confirm", "ClaveSegura1");
  await invited.locator("main button[type=submit]").click();
  await invited.waitForURL(/\/panel/);
  ok("nuevo dueño define contraseña y entra a su panel");
} finally {
  await browser.close();
}

if (errors.length) {
  console.error("\nErrores de JavaScript en páginas:\n" + errors.join("\n"));
  process.exit(1);
}
console.log("\nTodo OK");
