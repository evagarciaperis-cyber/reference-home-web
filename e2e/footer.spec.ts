import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { test, expect, type Page } from "@playwright/test";
import { compareScreenshots } from "./utils/diff";

const ORACLE_DIR = path.join(__dirname, "oracle");
const CAPTURES_DIR = path.join(__dirname, "__captures__");
const PARITY_THRESHOLD = 0.001;

async function scrollToFooter(page: Page) {
  await page.evaluate(() => {
    window.scrollTo({ top: document.body.scrollHeight, left: 0, behavior: "instant" });
  });
}

async function gotoAndSettle(page: Page, baseURL: string | undefined) {
  await page.goto(new URL("/", baseURL).href);
  await page.waitForSelector('[data-shell="preloader"]', { state: "hidden", timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(300);
}

// ---------------------------------------------------------------------
// Paridad visual
// ---------------------------------------------------------------------

test("footer: paridad visual en su único estado (sección estática)", async ({ page, baseURL }, testInfo) => {
  const oraclePath = path.join(ORACLE_DIR, `footer-${testInfo.project.name}-home.png`);
  test.skip(
    !existsSync(oraclePath),
    `No existe oráculo para "footer-${testInfo.project.name}". Ejecuta "npm run parity:update-oracle-footer".`,
  );
  const oracleBuf = readFileSync(oraclePath);

  await gotoAndSettle(page, baseURL);
  await scrollToFooter(page);
  await page.waitForTimeout(300);

  const currentBuf = await page.screenshot();
  mkdirSync(path.join(CAPTURES_DIR, "current"), { recursive: true });
  writeFileSync(path.join(CAPTURES_DIR, "current", `footer-${testInfo.project.name}-home.png`), currentBuf);

  const diffPath = path.join(CAPTURES_DIR, "diff", `footer-${testInfo.project.name}-home.png`);
  const { diffRatio, diffPixels, totalPixels } = compareScreenshots(oracleBuf, currentBuf, diffPath);
  await testInfo.attach(`diff-footer-${testInfo.project.name}`, { path: diffPath, contentType: "image/png" });
  console.log(`[footer] ${testInfo.project.name}: ${(diffRatio * 100).toFixed(3)}% (${diffPixels}/${totalPixels}px)`);

  expect(diffRatio, "paridad visual de Footer — revisa el diff adjunto").toBeLessThan(PARITY_THRESHOLD);
});

// ---------------------------------------------------------------------
// Comportamiento
// ---------------------------------------------------------------------

test("estructura: fuera de <main>, hermano directo de él", async ({ page, baseURL }) => {
  await gotoAndSettle(page, baseURL);
  const isSiblingOfMain = await page.evaluate(() => {
    const footer = document.querySelector("[data-site-footer]");
    const main = document.querySelector("main");
    return footer?.parentElement === main?.parentElement && footer?.previousElementSibling === main;
  });
  expect(isSiblingOfMain).toBe(true);
});

test("enlaces: Enlaces apuntan a las anclas de la home", async ({ page, baseURL }) => {
  await gotoAndSettle(page, baseURL);
  const footer = page.locator("[data-site-footer]");
  await expect(footer.getByRole("link", { name: "Inicio" })).toHaveAttribute("href", "#inicio");
  await expect(footer.getByRole("link", { name: "Soluciones" })).toHaveAttribute("href", "#soluciones");
  await expect(footer.getByRole("link", { name: "Proyectos" })).toHaveAttribute("href", "#proyectos");
});

test("enlaces: Contacto usa mailto y tel", async ({ page, baseURL }) => {
  await gotoAndSettle(page, baseURL);
  const footer = page.locator("[data-site-footer]");
  await expect(footer.getByRole("link", { name: "hola@tudominio.es" })).toHaveAttribute(
    "href",
    "mailto:hola@tudominio.es",
  );
  await expect(footer.getByRole("link", { name: "+34 000 000 000" })).toHaveAttribute("href", "tel:+34000000000");
});

test("enlaces: Legal apunta a privacidad.html y README.txt", async ({ page, baseURL }) => {
  await gotoAndSettle(page, baseURL);
  const footer = page.locator("[data-site-footer]");
  await expect(footer.getByRole("link", { name: "Privacidad" })).toHaveAttribute("href", "privacidad.html");
  await expect(footer.getByRole("link", { name: "Documentación" })).toHaveAttribute("href", "README.txt");
});

test("enlace: Volver arriba lleva a #inicio", async ({ page, baseURL }) => {
  await gotoAndSettle(page, baseURL);
  const footer = page.locator("[data-site-footer]");
  await expect(footer.getByRole("link", { name: /Volver arriba/ })).toHaveAttribute("href", "#inicio");
});

test("navegación por teclado: los enlaces del footer reciben foco en orden", async ({ page, baseURL }) => {
  await gotoAndSettle(page, baseURL);
  const footer = page.locator("[data-site-footer]");
  const links = footer.locator("a");
  const count = await links.count();
  expect(count).toBe(8); // Inicio, Soluciones, Proyectos, mailto, tel, Privacidad, Documentación, Volver arriba

  await links.first().focus();
  await expect(links.first()).toBeFocused();
});

test("responsive: el grid pasa a 2 columnas en el breakpoint de 640px", async ({ page, baseURL }) => {
  await gotoAndSettle(page, baseURL);
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("Sin viewport");

  const footer = page.locator("[data-site-footer]");
  const grid = footer.locator("> div").nth(1); // top, grid, bottom
  const columns = (await grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns)).split(" ").length;
  expect(columns).toBe(viewport.width <= 640 ? 2 : 4);
});

// ---------------------------------------------------------------------
// Integración con Contact, Header, NoiseOverlay, CustomCursor
// ---------------------------------------------------------------------

test("integración: Footer marca el header on-dark al llegar al final de la página", async ({ page, baseURL }) => {
  await gotoAndSettle(page, baseURL);
  await scrollToFooter(page);
  await expect(page.locator("[data-header]")).toHaveClass(/onDark/);
});

test("integración con NoiseOverlay: sigue presente sobre Footer", async ({ page, baseURL }) => {
  await gotoAndSettle(page, baseURL);
  await scrollToFooter(page);
  const noise = page.locator('[data-shell="noise"]');
  await expect(noise).toBeAttached();
  await expect(noise).toHaveCSS("z-index", "1000");
});

test("integración con CustomCursor: los enlaces del footer no activan el texto del cursor (fidelidad)", async ({
  page,
  baseURL,
}) => {
  await gotoAndSettle(page, baseURL);
  await scrollToFooter(page);
  const links = page.locator("[data-site-footer] a");
  const count = await links.count();
  for (let i = 0; i < count; i++) {
    await expect(links.nth(i)).not.toHaveAttribute("data-cursor", /.*/);
  }
});
