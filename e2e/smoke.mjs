// Prueba de humo end-to-end contra el entorno local (npm run dev + supabase start + seed).
// Usa el Chrome instalado en el sistema: npm run test:e2e
// Recorre: inscripción de cliente → tarjeta web → cajero busca y suma sello →
// dueño restablece PIN con uno temporal elegido → el cliente lo cambia → super admin
// ve los clientes, crea un negocio con su dueño y el dueño ingresa.
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
  await customer.fill("#phone", `310 ${run.slice(0, 3)} ${run.slice(3)}1`);
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

  // 5. Dueño restablece el PIN con uno temporal elegido; el cliente lo cambia
  await owner.goto(`${B}/panel/clientes?q=${encodeURIComponent(name)}`);
  await owner.getByText(name).click();
  await owner.waitForURL(/\/panel\/clientes\/.+/);
  await owner.getByRole("button", { name: "Restablecer PIN" }).click();
  await owner.getByPlaceholder("····").fill("8642");
  await owner.getByRole("button", { name: "Sí, restablecer" }).click();
  await owner.getByText("8642").waitFor();
  ok("dueño restablece el PIN con un temporal elegido");

  const returning = await (await browser.newContext({ ...devices["iPhone 13"] })).newPage();
  watch(returning, "cliente-reingreso");
  await returning.goto(`${B}/n/cafe-luna/ingresar`);
  await returning.fill("#phone", `310 ${run.slice(0, 3)} ${run.slice(3)}1`);
  await returning.fill("#pin", "8642");
  await returning.locator("main button[type=submit]").first().click();
  await returning.waitForURL(/nuevo-pin/);
  await returning.fill("#pin", "5173");
  await returning.fill("#pinConfirm", "5173");
  await returning.locator("main button[type=submit]").click();
  await returning.waitForURL(/\/t\//);
  ok("cliente entra con el PIN temporal y crea uno nuevo");

  // 6. Super admin ve los clientes del negocio y crea un negocio con su dueño
  const admin = await (await browser.newContext()).newPage();
  watch(admin, "admin");
  await login(admin, "admin@tarjetas.test");
  await admin.waitForURL(/\/admin/);
  await admin.goto(`${B}/admin/negocios/11111111-1111-1111-1111-111111111111`);
  await admin.getByText(name).waitFor();
  ok("super admin ve los clientes y tarjetas del negocio");
  const programForm = admin.locator("form", { has: admin.locator("[name=reward_description]") });
  await programForm.locator("[name=reward_description]").fill("Un café gratis (e2e)");
  await programForm.locator("button[type=submit]").click();
  await admin.getByText("Programa actualizado").waitFor();
  await programForm.locator("[name=reward_description]").fill("Un café gratis");
  await programForm.locator("button[type=submit]").click();
  await admin.getByText("Programa actualizado").waitFor();
  ok("super admin edita y guarda el programa");

  await admin.goto(`${B}/admin/negocios/nuevo`);
  await admin.fill("[name=name]", `Negocio E2E ${run}`);
  await admin.fill("[name=card_title]", "Club E2E");
  await admin.fill("[name=stamps_required]", "8");
  await admin.fill("[name=reward_description]", "Premio de prueba");
  await admin.fill("[name=owner_name]", "Dueño E2E");
  await admin.fill("[name=owner_email]", `owner-${run}@e2e.test`);
  await admin.fill("[name=owner_password]", "ClaveSegura1");
  await admin.locator("main button[type=submit]").last().click();
  await admin.getByText("Negocio creado").waitFor();
  ok("super admin crea negocio con su dueño");

  await admin.getByRole("link", { name: "Ver negocio" }).click();
  await admin.waitForURL(/\/admin\/negocios\/[0-9a-f-]{36}/);
  const userForm = admin.locator("form", { has: admin.locator("select[name=role]") });
  await userForm.locator("[name=full_name]").fill("Cajero E2E");
  await userForm.locator("[name=email]").fill(`cajero-${run}@e2e.test`);
  await userForm.locator("[name=password]").fill("ClaveCajero1");
  await userForm.locator("button[type=submit]").click();
  await admin.getByText("Usuario creado").waitFor();
  ok("super admin crea un cajero");

  const newCashier = await (await browser.newContext({ ...devices["Pixel 7"] })).newPage();
  await login(newCashier, `cajero-${run}@e2e.test`, "ClaveCajero1");
  await newCashier.waitForURL(/\/escaner/);
  ok("el cajero nuevo entra directo al escáner");

  await admin.goto(`${B}/admin/negocios/11111111-1111-1111-1111-111111111111?q=${encodeURIComponent(name)}`);
  await admin.getByRole("button", { name: "Gestionar →" }).first().click();
  await admin.waitForURL(/\/panel\/clientes\/.+/);
  await admin.getByText("Estás viendo como").waitFor();
  ok("«Gestionar» abre la ficha del cliente en modo ver como");

  const newOwner = await (await browser.newContext()).newPage();
  watch(newOwner, "nuevo-dueño");
  await login(newOwner, `owner-${run}@e2e.test`, "ClaveSegura1");
  await newOwner.waitForURL(/\/panel/);
  ok("el nuevo dueño ingresa con la contraseña definida por el admin");
} finally {
  await browser.close();
}

if (errors.length) {
  console.error("\nErrores de JavaScript en páginas:\n" + errors.join("\n"));
  process.exit(1);
}
console.log("\nTodo OK");
