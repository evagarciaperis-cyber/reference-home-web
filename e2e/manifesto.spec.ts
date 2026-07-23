import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { compareScreenshots } from "./utils/diff";

const ORACLE_DIR = path.join(__dirname, "oracle");
const CAPTURES_DIR = path.join(__dirname, "__captures__");
const PARITY_THRESHOLD = 0.001;

async function scrollToManifesto(page: import("@playwright/test").Page) {
  await page.evaluate(() => {
    const el = document.getElementById("estudio");
    if (el) window.scrollTo({ top: el.offsetTop, left: 0, behavior: "instant" });
  });
}

// ---------------------------------------------------------------------
// Paridad visual
// ---------------------------------------------------------------------

test("manifesto: paridad visual tras el scroll y la revelación", async ({ page, baseURL }, testInfo) => {
  const oraclePath = path.join(ORACLE_DIR, `manifesto-${testInfo.project.name}-home.png`);
  test.skip(
    !existsSync(oraclePath),
    `No existe oráculo para "manifesto-${testInfo.project.name}". Ejecuta "npm run parity:update-oracle-manifesto".`,
  );
  const oracleBuf = readFileSync(oraclePath);

  await page.goto(new URL("/", baseURL).href);
  await page.waitForSelector('[data-shell="preloader"]', { state: "hidden", timeout: 3000 }).catch(() => {});
  await scrollToManifesto(page);
  await page.waitForTimeout(1500); // dispara IntersectionObserver + escalonado de 28ms/palabra + margen

  const currentBuf = await page.screenshot();
  mkdirSync(path.join(CAPTURES_DIR, "current"), { recursive: true });
  writeFileSync(path.join(CAPTURES_DIR, "current", `manifesto-${testInfo.project.name}-home.png`), currentBuf);

  const diffPath = path.join(CAPTURES_DIR, "diff", `manifesto-${testInfo.project.name}-home.png`);
  const { diffRatio, diffPixels, totalPixels } = compareScreenshots(oracleBuf, currentBuf, diffPath);
  await testInfo.attach(`diff-manifesto-${testInfo.project.name}`, { path: diffPath, contentType: "image/png" });
  console.log(`[manifesto] ${testInfo.project.name}: ${(diffRatio * 100).toFixed(3)}% (${diffPixels}/${totalPixels}px)`);

  expect(diffRatio, "paridad visual de Manifesto — revisa el diff adjunto").toBeLessThan(PARITY_THRESHOLD);
});

// ---------------------------------------------------------------------
// Comportamiento
// ---------------------------------------------------------------------

test("estado inicial: las palabras están atenuadas antes de entrar en el viewport", async ({ page, baseURL }) => {
  await page.goto(new URL("/", baseURL).href);
  // Sin hacer scroll: Manifesto está fuera del viewport inicial (Hero es
  // min-height:100svh), así que sus palabras no deben haberse revelado.
  const firstWord = page.locator("[data-word]").first();
  await expect(firstWord).not.toHaveAttribute("data-visible", "true");
  await expect(firstWord).toHaveCSS("opacity", "0.16");
});

test("entrada: las palabras se revelan de forma escalonada al hacer scroll", async ({ page, baseURL }) => {
  await page.goto(new URL("/", baseURL).href);
  await scrollToManifesto(page);

  const words = page.locator("[data-word]");
  const count = await words.count();
  expect(count, "el texto debe partirse en varias palabras").toBeGreaterThan(1);

  // La primera palabra se revela casi de inmediato (retraso 0ms); la
  // última, tras (n-1)*28ms. Comprobar que hay una diferencia real de
  // tiempo confirma el escalonado sin depender de un valor exacto de ms.
  await expect(words.first()).toHaveAttribute("data-visible", "true", { timeout: 1000 });
  await expect(words.last()).not.toHaveAttribute("data-visible", "true");
  await expect(words.last()).toHaveAttribute("data-visible", "true", { timeout: 2000 });

  for (let i = 0; i < count; i++) {
    await expect(words.nth(i)).toHaveCSS("opacity", "1");
  }
});

test("salida: las palabras reveladas no vuelven a ocultarse al salir del viewport", async ({ page, baseURL }) => {
  await page.goto(new URL("/", baseURL).href);
  await scrollToManifesto(page);
  await page.waitForTimeout(1500);

  const firstWord = page.locator("[data-word]").first();
  await expect(firstWord).toHaveCSS("opacity", "1");

  // Vuelve arriba (fuera del viewport de Manifesto) -- el original hace
  // unobserve() tras la primera revelación, así que debe permanecer visible.
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
  await expect(firstWord).toHaveCSS("opacity", "1");
});

test("scroll: la imagen del visual-frame aplica el desplazamiento de parallax", async ({ page, baseURL }) => {
  await page.goto(new URL("/", baseURL).href);
  await scrollToManifesto(page);
  await page.waitForTimeout(300);

  const img = page.locator("#estudio img");
  const transformAtA = await img.evaluate((el) => (el as HTMLElement).style.transform);
  expect(transformAtA).toMatch(/scale\(1\.08\)/);

  await page.evaluate(() => window.scrollBy({ top: 300, left: 0, behavior: "instant" }));
  await page.waitForTimeout(300);
  const transformAtB = await img.evaluate((el) => (el as HTMLElement).style.transform);

  expect(transformAtB, "el offset de parallax debe cambiar al hacer scroll").not.toBe(transformAtA);
});

test("responsive: el grid pasa a una columna en viewports estrechos", async ({ page, baseURL }) => {
  await page.goto(new URL("/", baseURL).href);
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("Sin viewport");

  const grid = page.locator("#estudio > div").nth(1); // 0: SectionLabel, 1: .grid, 2: .visual
  const columns = await grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns);
  const columnCount = columns.split(" ").length;

  if (viewport.width <= 900) {
    expect(columnCount).toBe(1);
  } else {
    expect(columnCount).toBe(2); // 1fr 3fr
  }
});

test("capas: Manifesto no interfiere con el z-index de NoiseOverlay", async ({ page, baseURL }) => {
  await page.goto(new URL("/", baseURL).href);
  await scrollToManifesto(page);
  const noise = page.locator('[data-shell="noise"]');
  await expect(noise).toBeAttached();
  await expect(noise).toHaveCSS("z-index", "1000");
});

test("continuidad visual: mismo fondo que el Hero (sin salto de color)", async ({ page, baseURL }) => {
  await page.goto(new URL("/", baseURL).href);
  const heroBg = await page.locator("#inicio").evaluate((el) => getComputedStyle(el).backgroundColor);
  const manifestoBg = await page.locator("#estudio").evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(manifestoBg).toBe(heroBg);
});

test("integración con Header: Manifesto no lo marca como on-dark", async ({ page, baseURL }) => {
  await page.goto(new URL("/", baseURL).href);
  await page.waitForSelector('[data-shell="preloader"]', { state: "hidden", timeout: 3000 }).catch(() => {});
  await scrollToManifesto(page);
  await expect(page.locator("[data-header]")).not.toHaveClass(/onDark/);
});

test("integración con CustomCursor: el enlace \"Conoce el proceso\" no activa el texto del cursor (fidelidad)", async ({
  page,
  baseURL,
}) => {
  await page.goto(new URL("/", baseURL).href);
  await scrollToManifesto(page);
  const link = page.getByRole("link", { name: "Conoce el proceso ↗" });
  await expect(link).not.toHaveAttribute("data-cursor", /.*/);
});
