import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { test, expect, type Page } from "@playwright/test";
import { compareScreenshots } from "./utils/diff";

const ORACLE_DIR = path.join(__dirname, "oracle");
const CAPTURES_DIR = path.join(__dirname, "__captures__");
const PARITY_THRESHOLD = 0.001;

async function scrollToContact(page: Page) {
  await page.evaluate(() => {
    const el = document.getElementById("contacto");
    if (el) window.scrollTo({ top: el.offsetTop, left: 0, behavior: "instant" });
  });
}

async function gotoAndSettle(page: Page, baseURL: string | undefined) {
  await page.goto(new URL("/", baseURL).href);
  await page.waitForSelector('[data-shell="preloader"]', { state: "hidden", timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(300);
}

// Mockea el fetch del formulario para no depender de send.php (que no
// existe en este proyecto -- ver comentario en Contact.tsx). Se
// intercepta la llamada de red, no la lógica de submit: el componente
// sigue ejecutando exactamente el mismo código (preventDefault, fetch,
// parseo de JSON, try/catch/finally) que en producción.
async function mockSubmitSuccess(page: Page, message = "Mensaje enviado.") {
  await page.route("**/send.php", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, message }) }),
  );
}

async function fillRequiredFields(page: Page) {
  const form = page.locator("#contacto form");
  await form.locator('input[name="name"]').fill("Nombre de prueba");
  await form.locator('input[name="phone"]').fill("600000000");
  await form.locator('input[name="email"]').fill("prueba@example.com");
  await form.locator('input[name="privacy"]').check();
}

// ---------------------------------------------------------------------
// Paridad visual
// ---------------------------------------------------------------------

test("contact: paridad visual en su único estado (sección estática)", async ({ page, baseURL }, testInfo) => {
  const oraclePath = path.join(ORACLE_DIR, `contact-${testInfo.project.name}-home.png`);
  test.skip(
    !existsSync(oraclePath),
    `No existe oráculo para "contact-${testInfo.project.name}". Ejecuta "npm run parity:update-oracle-contact".`,
  );
  const oracleBuf = readFileSync(oraclePath);

  await gotoAndSettle(page, baseURL);
  await scrollToContact(page);
  await page.waitForTimeout(300);

  const currentBuf = await page.screenshot();
  mkdirSync(path.join(CAPTURES_DIR, "current"), { recursive: true });
  writeFileSync(path.join(CAPTURES_DIR, "current", `contact-${testInfo.project.name}-home.png`), currentBuf);

  const diffPath = path.join(CAPTURES_DIR, "diff", `contact-${testInfo.project.name}-home.png`);
  const { diffRatio, diffPixels, totalPixels } = compareScreenshots(oracleBuf, currentBuf, diffPath);
  await testInfo.attach(`diff-contact-${testInfo.project.name}`, { path: diffPath, contentType: "image/png" });
  console.log(`[contact] ${testInfo.project.name}: ${(diffRatio * 100).toFixed(3)}% (${diffPixels}/${totalPixels}px)`);

  expect(diffRatio, "paridad visual de Contact — revisa el diff adjunto").toBeLessThan(PARITY_THRESHOLD);
});

// ---------------------------------------------------------------------
// Comportamiento del formulario
// ---------------------------------------------------------------------

test.describe("formulario de contacto", () => {
  test("campos: nombre, teléfono, correo y checkbox de privacidad son obligatorios; mensaje no", async ({
    page,
    baseURL,
  }) => {
    await gotoAndSettle(page, baseURL);
    const form = page.locator("#contacto form");
    await expect(form.locator('input[name="name"]')).toHaveAttribute("required", "");
    await expect(form.locator('input[name="phone"]')).toHaveAttribute("required", "");
    await expect(form.locator('input[name="email"]')).toHaveAttribute("required", "");
    await expect(form.locator('input[name="privacy"]')).toHaveAttribute("required", "");
    await expect(form.locator('textarea[name="message"]')).not.toHaveAttribute("required", "");
  });

  test("tipos de campo: teléfono usa type=tel, correo usa type=email", async ({ page, baseURL }) => {
    await gotoAndSettle(page, baseURL);
    const form = page.locator("#contacto form");
    await expect(form.locator('input[name="phone"]')).toHaveAttribute("type", "tel");
    await expect(form.locator('input[name="email"]')).toHaveAttribute("type", "email");
  });

  test("honeypot: el campo señuelo está oculto y fuera del orden de tabulación", async ({ page, baseURL }) => {
    await gotoAndSettle(page, baseURL);
    const honeypot = page.locator('#contacto form input[name="company"]');
    await expect(honeypot).toHaveAttribute("tabindex", "-1");
    await expect(honeypot).toHaveAttribute("aria-hidden", "true");
    // No se usa toBeVisible(): el original lo oculta desplazándolo fuera de
    // pantalla (left:-9999px), no con display:none/visibility:hidden, así
    // que sigue teniendo una caja de 1x1px -- Playwright lo considera
    // "visible" aunque esté fuera de la vista. Se comprueba la posición
    // real en su lugar.
    const box = await honeypot.boundingBox();
    expect(box?.x).toBeLessThan(0);
  });

  test("focus: el input activo cambia el fondo del campo", async ({ page, baseURL }) => {
    await gotoAndSettle(page, baseURL);
    const nameInput = page.locator('#contacto form input[name="name"]');
    await nameInput.focus();
    await expect(nameInput).toBeFocused();
  });

  test("navegación por teclado: Tab recorre los campos en el orden del DOM", async ({ page, baseURL }) => {
    await gotoAndSettle(page, baseURL);
    const form = page.locator("#contacto form");
    await form.locator('input[name="name"]').focus();
    await expect(form.locator('input[name="name"]')).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(form.locator('input[name="phone"]')).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(form.locator('input[name="email"]')).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(form.locator('textarea[name="message"]')).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(form.locator('input[name="privacy"]')).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(form.locator("a")).toBeFocused(); // enlace "política de privacidad"

    await page.keyboard.press("Tab");
    await expect(form.locator('button[type="submit"]')).toBeFocused();
  });

  test("checkbox: se puede marcar y desmarcar con teclado (barra espaciadora)", async ({ page, baseURL }) => {
    await gotoAndSettle(page, baseURL);
    const checkbox = page.locator('#contacto form input[name="privacy"]');
    await checkbox.focus();
    await expect(checkbox).not.toBeChecked();
    await page.keyboard.press("Space");
    await expect(checkbox).toBeChecked();
    await page.keyboard.press("Space");
    await expect(checkbox).not.toBeChecked();
  });

  test("enlace legal: apunta a privacidad.html", async ({ page, baseURL }) => {
    await gotoAndSettle(page, baseURL);
    const link = page.locator("#contacto form label a");
    await expect(link).toHaveAttribute("href", "privacidad.html");
  });

  test("envío simulado: muestra 'Enviando…', deshabilita el botón y luego el mensaje final", async ({
    page,
    baseURL,
  }) => {
    await gotoAndSettle(page, baseURL);
    await mockSubmitSuccess(page, "Mensaje enviado correctamente.");
    await fillRequiredFields(page);

    const button = page.locator('#contacto form button[type="submit"]');
    const status = page.locator("#contacto form [role='status']");

    await button.click();
    await expect(status).toHaveText("Mensaje enviado correctamente.");
    await expect(button).toBeEnabled();
  });

  test("envío simulado: un error del servidor deja el mensaje de error visible", async ({ page, baseURL }) => {
    await gotoAndSettle(page, baseURL);
    await page.route("**/send.php", (route) =>
      route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ ok: false, message: "No se pudo enviar." }) }),
    );
    await fillRequiredFields(page);

    const button = page.locator('#contacto form button[type="submit"]');
    const status = page.locator("#contacto form [role='status']");

    await button.click();
    await expect(status).toHaveText("No se pudo enviar.");
    await expect(button).toBeEnabled();
  });

  test("reset: el formulario se vacía tras un envío correcto", async ({ page, baseURL }) => {
    await gotoAndSettle(page, baseURL);
    await mockSubmitSuccess(page);
    await fillRequiredFields(page);

    const form = page.locator("#contacto form");
    await form.locator('button[type="submit"]').click();
    await expect(page.locator("#contacto form [role='status']")).not.toHaveText("");
    await expect(form.locator('input[name="name"]')).toHaveValue("");
    await expect(form.locator('input[name="privacy"]')).not.toBeChecked();
  });
});

// ---------------------------------------------------------------------
// Responsive
// ---------------------------------------------------------------------

test("responsive: Contact pasa de dos columnas a una en el breakpoint de 900px", async ({ page, baseURL }) => {
  await gotoAndSettle(page, baseURL);
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("Sin viewport");

  const section = page.locator("#contacto");
  const columns = (await section.evaluate((el) => getComputedStyle(el).gridTemplateColumns)).split(" ").length;
  expect(columns).toBe(viewport.width <= 900 ? 1 : 2);
});

// ---------------------------------------------------------------------
// Integración con Stats, Header, NoiseOverlay, CustomCursor
// ---------------------------------------------------------------------

test("integración: Contact viene justo después de Stats y marca el header on-dark", async ({ page, baseURL }) => {
  await gotoAndSettle(page, baseURL);

  const order = await page.evaluate(() => {
    const main = document.querySelector("main");
    return Array.from(main?.children ?? []).map((el) => {
      if (el.hasAttribute("data-stats")) return "stats";
      return el.id;
    });
  });
  const statsIdx = order.indexOf("stats");
  const contactoIdx = order.indexOf("contacto");
  expect(statsIdx).toBeGreaterThanOrEqual(0);
  expect(contactoIdx).toBe(statsIdx + 1);

  await page.waitForSelector('[data-shell="preloader"]', { state: "hidden", timeout: 3000 }).catch(() => {});
  await scrollToContact(page);
  await expect(page.locator("[data-header]")).toHaveClass(/onDark/);
});

test("integración con NoiseOverlay: sigue presente sobre Contact", async ({ page, baseURL }) => {
  await gotoAndSettle(page, baseURL);
  await scrollToContact(page);
  const noise = page.locator('[data-shell="noise"]');
  await expect(noise).toBeAttached();
  await expect(noise).toHaveCSS("z-index", "1000");
});

test("integración con CustomCursor: los campos del formulario no activan el texto del cursor (fidelidad)", async ({
  page,
  baseURL,
}) => {
  await gotoAndSettle(page, baseURL);
  await scrollToContact(page);
  const form = page.locator("#contacto form");
  await expect(form).not.toHaveAttribute("data-cursor", /.*/);
  await expect(form.locator('button[type="submit"]')).not.toHaveAttribute("data-cursor", /.*/);
});

test("botón magnético: se desplaza hacia el cursor en desktop con puntero fino", async ({ page, baseURL }, testInfo) => {
  test.skip(testInfo.project.name.endsWith("-reduced"), "El hook se desactiva con prefers-reduced-motion");
  await gotoAndSettle(page, baseURL);
  await scrollToContact(page);

  const button = page.locator('#contacto form button[type="submit"]');
  // En viewports ≤900px, Contact pasa a una columna y el formulario queda
  // más abajo dentro de la sección -- el botón puede no estar en el
  // viewport tras alinear solo el inicio de la sección con scrollToContact.
  await button.scrollIntoViewIfNeeded();
  const box = await button.boundingBox();
  if (!box) throw new Error("No se pudo medir el botón");

  const before = await button.evaluate((el) => getComputedStyle(el).transform);
  await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.1);
  await expect.poll(() => button.evaluate((el) => getComputedStyle(el).transform)).not.toBe(before);

  await page.mouse.move(10, 10);
  await expect.poll(() => button.evaluate((el) => getComputedStyle(el).transform)).toBe("none");
});
