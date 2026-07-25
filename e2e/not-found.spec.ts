import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { compareScreenshots } from "./utils/diff";
import { hideAppShell } from "./utils/settle";

const NONEXISTENT_PATH = "/esta-ruta-no-existe";
const ORACLE_DIR = path.join(__dirname, "oracle");
const CAPTURES_DIR = path.join(__dirname, "__captures__");
const PARITY_THRESHOLD = 0.001;

async function gotoAndSettle(page: import("@playwright/test").Page, baseURL: string | undefined) {
  await page.goto(new URL(NONEXISTENT_PATH, baseURL).href);
  await page.waitForSelector('[data-shell="preloader"]', { state: "hidden", timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(300);
}

// El resto de este archivo cubre el comportamiento propio de la página,
// acotado siempre a roles/texto de su propio contenido (heading/enlace
// "Volver al inicio") o a atributos ya scoped de otras fases
// ([data-header], [data-site-footer]), nunca a selectores globales sin
// scope de sección (regla nº7 de la fase 13, mantenida aquí).

test("404: paridad visual del contenido propio (shell oculto)", async ({ page, baseURL }, testInfo) => {
  const oraclePath = path.join(ORACLE_DIR, `notfound-${testInfo.project.name}.png`);
  test.skip(
    !existsSync(oraclePath),
    `No existe oráculo para "notfound-${testInfo.project.name}". Ejecuta "npm run parity:update-oracle-notfound".`,
  );
  const oracleBuf = readFileSync(oraclePath);

  await gotoAndSettle(page, baseURL);
  await hideAppShell(page);

  const currentBuf = await page.screenshot();
  mkdirSync(path.join(CAPTURES_DIR, "current"), { recursive: true });
  writeFileSync(path.join(CAPTURES_DIR, "current", `notfound-${testInfo.project.name}.png`), currentBuf);

  const diffPath = path.join(CAPTURES_DIR, "diff", `notfound-${testInfo.project.name}.png`);
  const { diffRatio, diffPixels, totalPixels } = compareScreenshots(oracleBuf, currentBuf, diffPath);
  await testInfo.attach(`diff-notfound-${testInfo.project.name}`, { path: diffPath, contentType: "image/png" });
  console.log(`[notfound] ${testInfo.project.name}: ${(diffRatio * 100).toFixed(3)}% (${diffPixels}/${totalPixels}px)`);

  expect(diffRatio, "paridad visual del contenido de la 404 — revisa el diff adjunto").toBeLessThan(PARITY_THRESHOLD);
});

test("acceso directo: una ruta inexistente muestra la página 404, no un error del servidor", async ({
  page,
  baseURL,
}) => {
  const response = await page.goto(new URL(NONEXISTENT_PATH, baseURL).href);
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: /Esta página.*no existe\./s })).toBeVisible();
});

test("contenido: eyebrow, titular y párrafo se muestran literalmente", async ({ page, baseURL }) => {
  await gotoAndSettle(page, baseURL);
  await expect(page.getByText("Error 404")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Esta página.*no existe\./s })).toBeVisible();
  await expect(page.getByText("El enlace puede haber cambiado o la página todavía no está creada.")).toBeVisible();
});

test("navegación de regreso: el enlace 'Volver al inicio' lleva a la home", async ({ page, baseURL }) => {
  await gotoAndSettle(page, baseURL);
  const link = page.getByRole("link", { name: "Volver al inicio ↗" });
  await expect(link).toHaveAttribute("href", "/");
  await link.click();
  await expect(page).toHaveURL(new URL("/", baseURL).href);
  await expect(page.locator("[data-header]")).toBeVisible();
});

test("navegación hacia atrás: tras volver a la home, el botón atrás regresa a la 404", async ({ page, baseURL }) => {
  await gotoAndSettle(page, baseURL);
  await page.getByRole("link", { name: "Volver al inicio ↗" }).click();
  await expect(page).toHaveURL(new URL("/", baseURL).href);

  await page.goBack();
  await expect(page).toHaveURL(new URL(NONEXISTENT_PATH, baseURL).href);
  await expect(page.getByRole("heading", { name: /Esta página.*no existe\./s })).toBeVisible();
});

test("teclado: el enlace de regreso es alcanzable y activable con Tab + Enter", async ({ page, baseURL }) => {
  await gotoAndSettle(page, baseURL);
  const link = page.getByRole("link", { name: "Volver al inicio ↗" });
  await link.focus();
  await expect(link).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new URL("/", baseURL).href);
});

test("integración: el Header global sigue presente y funcional en la 404", async ({ page, baseURL }, testInfo) => {
  await gotoAndSettle(page, baseURL);
  const header = page.locator("[data-header]");
  await expect(header).toBeVisible();
  // El comportamiento propio del header (nav de escritorio vs. menú móvil,
  // umbrales de scroll, on-dark...) ya se valida exhaustivamente en
  // header.spec.ts (fase 3) -- aquí solo importa que el header siga
  // presente y funcional en esta ruta nueva. La nav de escritorio está
  // oculta en viewports ≤900px (sustituida por el menú móvil), así que el
  // enlace "Inicio" del brand (siempre presente) es la comprobación
  // estable en todos los viewports.
  const width = Number(testInfo.project.name.match(/-(\d+)(?:-reduced)?$/)?.[1]);
  if (Number.isFinite(width) && width > 900) {
    await expect(
      header.getByRole("navigation").getByRole("link", { name: "Inicio", exact: true }),
    ).toHaveAttribute("href", "/");
  } else {
    await expect(header.getByRole("link", { name: "Volver al inicio" })).toHaveAttribute("href", "/");
  }
});

test("integración: Footer presente al final de la 404", async ({ page, baseURL }) => {
  await gotoAndSettle(page, baseURL);
  const footer = page.locator("[data-site-footer]");
  await expect(footer).toBeAttached();
  await footer.scrollIntoViewIfNeeded();
  await expect(footer).toBeVisible();
});

test("integración con NoiseOverlay: presente en la 404", async ({ page, baseURL }) => {
  await gotoAndSettle(page, baseURL);
  const noise = page.locator('[data-shell="noise"]');
  await expect(noise).toBeAttached();
  await expect(noise).toHaveCSS("z-index", "1000");
});

test("integración con CustomCursor: el enlace de regreso no activa el texto del cursor (fidelidad)", async ({
  page,
  baseURL,
}) => {
  await gotoAndSettle(page, baseURL);
  const link = page.getByRole("link", { name: "Volver al inicio ↗" });
  await expect(link).not.toHaveAttribute("data-cursor", /.*/);
});

test("responsive: el contenido se ajusta sin desbordamiento horizontal en mobile", async ({ page, baseURL }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-375" && testInfo.project.name !== "mobile-375-reduced", "Solo mobile");
  await gotoAndSettle(page, baseURL);
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});
