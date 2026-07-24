import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { test, expect, type Page } from "@playwright/test";
import { compareScreenshots } from "./utils/diff";

const ORACLE_DIR = path.join(__dirname, "oracle");
const CAPTURES_DIR = path.join(__dirname, "__captures__");
const PARITY_THRESHOLD = 0.001;

async function scrollToProcess(page: Page, behavior: ScrollBehavior = "instant") {
  await page.evaluate((b) => {
    const el = document.getElementById("proceso");
    if (el) window.scrollTo({ top: el.offsetTop, left: 0, behavior: b as ScrollBehavior });
  }, behavior);
}

// ---------------------------------------------------------------------
// Paridad visual
// ---------------------------------------------------------------------

test("process: paridad visual en su único estado (sección estática)", async ({ page, baseURL }, testInfo) => {
  const oraclePath = path.join(ORACLE_DIR, `process-${testInfo.project.name}-home.png`);
  test.skip(
    !existsSync(oraclePath),
    `No existe oráculo para "process-${testInfo.project.name}". Ejecuta "npm run parity:update-oracle-process".`,
  );
  const oracleBuf = readFileSync(oraclePath);

  await page.goto(new URL("/", baseURL).href);
  await page.waitForSelector('[data-shell="preloader"]', { state: "hidden", timeout: 3000 }).catch(() => {});
  await scrollToProcess(page);
  await page.waitForTimeout(500);

  const currentBuf = await page.screenshot();
  mkdirSync(path.join(CAPTURES_DIR, "current"), { recursive: true });
  writeFileSync(path.join(CAPTURES_DIR, "current", `process-${testInfo.project.name}-home.png`), currentBuf);

  const diffPath = path.join(CAPTURES_DIR, "diff", `process-${testInfo.project.name}-home.png`);
  const { diffRatio, diffPixels, totalPixels } = compareScreenshots(oracleBuf, currentBuf, diffPath);
  await testInfo.attach(`diff-process-${testInfo.project.name}`, { path: diffPath, contentType: "image/png" });
  console.log(`[process] ${testInfo.project.name}: ${(diffRatio * 100).toFixed(3)}% (${diffPixels}/${totalPixels}px)`);

  expect(diffRatio, "paridad visual de Process — revisa el diff adjunto").toBeLessThan(PARITY_THRESHOLD);
});

// ---------------------------------------------------------------------
// Comportamiento
// ---------------------------------------------------------------------
//
// Process es una sección estática (regla nº1 de la Fase 8, confirmada por
// el usuario tras detectar que el original NO aplica sticky/parallax/
// brújula a #proceso -- eso pertenece a .brand-story, fase 10). Por eso
// las comprobaciones de "recorrido"/"scroll lento y rápido"/"navegación
// hacia atrás" (regla nº9) se reducen a: el contenido no cambia ni se
// rompe sin importar cómo se llegue a la sección ni en qué dirección se
// abandone -- exactamente lo que se espera de una sección sin estado.

test("estado inicial: los 4 pasos están presentes en orden, sin interacción", async ({ page, baseURL }) => {
  await page.goto(new URL("/", baseURL).href);
  const numbers = await page.locator("#proceso article span").allTextContents();
  expect(numbers).toEqual(["01", "02", "03", "04"]);
  const titles = await page.locator("#proceso article h3").allTextContents();
  expect(titles).toEqual(["Descubrir", "Definir", "Diseñar", "Desarrollar"]);
});

test("entrada en la sección: llegar con scroll lento no altera el contenido", async ({ page, baseURL }) => {
  await page.goto(new URL("/", baseURL).href);
  await page.waitForSelector('[data-shell="preloader"]', { state: "hidden", timeout: 3000 }).catch(() => {});
  // Scroll "lento": varios pasos incrementales en vez de un único salto.
  const target = await page.evaluate(() => document.getElementById("proceso")?.offsetTop ?? 0);
  for (let y = 0; y <= target; y += Math.max(200, Math.round(target / 10))) {
    await page.evaluate((yy) => window.scrollTo({ top: yy, left: 0, behavior: "instant" }), y);
    await page.waitForTimeout(30);
  }
  await scrollToProcess(page);
  await expect(page.locator("#proceso h3").first()).toHaveText("Descubrir");
});

test("scroll rápido: un salto directo hasta el final de la página no rompe la sección", async ({ page, baseURL }) => {
  await page.goto(new URL("/", baseURL).href);
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, left: 0, behavior: "instant" }));
  await page.waitForTimeout(100);
  // Vuelve a Process directamente (salto largo hacia arriba) y comprueba
  // que el contenido sigue intacto tras el salto brusco.
  await scrollToProcess(page);
  await expect(page.locator("#proceso h3").first()).toHaveText("Descubrir");
  await expect(page.locator("#proceso article")).toHaveCount(4);
});

test("navegación hacia atrás: salir de Process y volver dentro no altera nada", async ({ page, baseURL }) => {
  await page.goto(new URL("/", baseURL).href);
  await scrollToProcess(page);
  await expect(page.locator("#proceso article")).toHaveCount(4);

  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
  await expect(page.locator("[data-header]")).not.toHaveClass(/onDark/);

  await scrollToProcess(page);
  await expect(page.locator("#proceso article")).toHaveCount(4);
  const titles = await page.locator("#proceso article h3").allTextContents();
  expect(titles).toEqual(["Descubrir", "Definir", "Diseñar", "Desarrollar"]);
});

test("responsive: la rejilla pasa de 4 a 2 a 1 columnas en los breakpoints", async ({ page, baseURL }) => {
  await page.goto(new URL("/", baseURL).href);
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("Sin viewport");

  const grid = page.locator("#proceso > div").nth(3); // texture, label, headline, grid
  const columns = (await grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns)).split(" ").length;
  const expected = viewport.width <= 640 ? 1 : viewport.width <= 900 ? 2 : 4;
  expect(columns).toBe(expected);
});

test("resize: cruzar los breakpoints en caliente recalcula las columnas de la rejilla", async ({ page, baseURL }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "Un único viewport de partida basta para probar el resize");
  await page.goto(new URL("/", baseURL).href);
  const grid = page.locator("#proceso > div").nth(3); // texture, label, headline, grid

  const before = (await grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns)).split(" ").length;
  expect(before).toBe(4);

  await page.setViewportSize({ width: 800, height: 900 });
  await expect.poll(() => grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length)).toBe(2);

  await page.setViewportSize({ width: 500, height: 900 });
  await expect.poll(() => grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length)).toBe(1);
});

test("continuidad: Process viene justo después de ProjectsGallery y usa fondo oscuro", async ({ page, baseURL }) => {
  await page.goto(new URL("/", baseURL).href);
  const order = await page.evaluate(() => {
    const main = document.querySelector("main");
    return Array.from(main?.children ?? []).map((el) => el.id);
  });
  const proyectosIdx = order.indexOf("proyectos");
  const procesoIdx = order.indexOf("proceso");
  expect(proyectosIdx).toBeGreaterThanOrEqual(0);
  expect(procesoIdx).toBe(proyectosIdx + 1);

  const bg = await page.locator("#proceso").evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).toBe("rgb(17, 17, 15)"); // var(--ink)
});

test("integración con Header: al hacer scroll hasta Process, el header pasa a on-dark", async ({ page, baseURL }) => {
  await page.goto(new URL("/", baseURL).href);
  await page.waitForSelector('[data-shell="preloader"]', { state: "hidden", timeout: 3000 }).catch(() => {});
  const header = page.locator("[data-header]");
  await expect(header).not.toHaveClass(/onDark/);

  await scrollToProcess(page);
  await expect(header).toHaveClass(/onDark/);

  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
  await expect(header).not.toHaveClass(/onDark/);
});

test("integración con NoiseOverlay: sigue presente sobre Process", async ({ page, baseURL }) => {
  await page.goto(new URL("/", baseURL).href);
  await scrollToProcess(page);
  const noise = page.locator('[data-shell="noise"]');
  await expect(noise).toBeAttached();
  await expect(noise).toHaveCSS("z-index", "1000");
});

test("integración con CustomCursor: los pasos no activan el texto del cursor (fidelidad)", async ({
  page,
  baseURL,
}) => {
  await page.goto(new URL("/", baseURL).href);
  await scrollToProcess(page);
  const articles = page.locator("#proceso article");
  const count = await articles.count();
  for (let i = 0; i < count; i++) {
    await expect(articles.nth(i)).not.toHaveAttribute("data-cursor", /.*/);
  }
});
