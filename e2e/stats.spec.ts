import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { test, expect, type Page } from "@playwright/test";
import { compareScreenshots } from "./utils/diff";

const ORACLE_DIR = path.join(__dirname, "oracle");
const CAPTURES_DIR = path.join(__dirname, "__captures__");
const PARITY_THRESHOLD = 0.001;

async function scrollToStatement(page: Page) {
  await page.evaluate(() => {
    const section = document.querySelector("[data-stats]") as HTMLElement | null;
    if (section) window.scrollTo({ top: section.offsetTop, left: 0, behavior: "instant" });
  });
}

async function scrollToGridEnd(page: Page) {
  await page.evaluate(() => {
    const grid = document.querySelector("[data-stats-grid]") as HTMLElement | null;
    if (!grid) return;
    const bottom = grid.offsetTop + grid.offsetHeight - window.innerHeight;
    window.scrollTo({ top: Math.max(0, bottom), left: 0, behavior: "instant" });
  });
}

async function waitForCountersDone(page: Page) {
  await page.waitForFunction(
    () =>
      Array.from(document.querySelectorAll("[data-count]")).every(
        (el) => el.textContent === (el as HTMLElement).dataset.count,
      ),
    undefined,
    { timeout: 5000 },
  );
}

async function waitForStatementRevealed(page: Page) {
  // Acotado a [data-stats]: [data-word] es un atributo compartido con
  // Manifesto (fase 5) -- sin acotar, esta espera nunca terminaría, porque
  // el scroll directo hasta Stats salta por encima de Manifesto y sus
  // palabras nunca llegan a intersecar (nunca se revelan).
  await page.waitForFunction(
    () =>
      Array.from(document.querySelectorAll("[data-stats] [data-word]")).every((el) => el.hasAttribute("data-visible")),
    undefined,
    { timeout: 5000 },
  );
}

async function gotoAndSettle(page: Page, baseURL: string | undefined) {
  await page.goto(new URL("/", baseURL).href);
  await page.waitForSelector('[data-shell="preloader"]', { state: "hidden", timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(300);
}

// ---------------------------------------------------------------------
// Paridad visual
// ---------------------------------------------------------------------

test("stats: paridad visual con el statement y los contadores revelados", async ({ page, baseURL }, testInfo) => {
  const oraclePath = path.join(ORACLE_DIR, `stats-${testInfo.project.name}-home.png`);
  test.skip(
    !existsSync(oraclePath),
    `No existe oráculo para "stats-${testInfo.project.name}". Ejecuta "npm run parity:update-oracle-stats".`,
  );
  const oracleBuf = readFileSync(oraclePath);

  await gotoAndSettle(page, baseURL);
  await scrollToStatement(page);
  await waitForStatementRevealed(page);
  await scrollToGridEnd(page);
  await waitForCountersDone(page);
  // El encuadre para la captura ES esta misma posición (final del grid),
  // no se vuelve a scrollear al inicio de la sección -- ver el comentario
  // de cabecera en capture-oracle-stats.ts (dependiente solo del contenido
  // de Stats mismo, inmune a cuánto exista después en la página).

  const currentBuf = await page.screenshot();
  mkdirSync(path.join(CAPTURES_DIR, "current"), { recursive: true });
  writeFileSync(path.join(CAPTURES_DIR, "current", `stats-${testInfo.project.name}-home.png`), currentBuf);

  const diffPath = path.join(CAPTURES_DIR, "diff", `stats-${testInfo.project.name}-home.png`);
  const { diffRatio, diffPixels, totalPixels } = compareScreenshots(oracleBuf, currentBuf, diffPath);
  await testInfo.attach(`diff-stats-${testInfo.project.name}`, { path: diffPath, contentType: "image/png" });
  console.log(`[stats] ${testInfo.project.name}: ${(diffRatio * 100).toFixed(3)}% (${diffPixels}/${totalPixels}px)`);

  expect(diffRatio, "paridad visual de Stats — revisa el diff adjunto").toBeLessThan(PARITY_THRESHOLD);
});

// ---------------------------------------------------------------------
// Comportamiento
// ---------------------------------------------------------------------

test("estado inicial: los contadores empiezan en 0 y el statement sin revelar", async ({ page, baseURL }) => {
  await gotoAndSettle(page, baseURL);
  const counters = page.locator("[data-count]");
  await expect(counters).toHaveCount(4);
  for (let i = 0; i < 4; i++) {
    await expect(counters.nth(i)).toHaveText("0");
  }
});

test("entrada: cada contador anima de 0 hasta su valor objetivo al entrar en el viewport", async ({
  page,
  baseURL,
}) => {
  await gotoAndSettle(page, baseURL);
  const counters = page.locator("[data-count]");
  const targets = await counters.evaluateAll((els) => els.map((el) => el.getAttribute("data-count")));
  expect(targets).toEqual(["45", "7", "100", "0"]);

  await scrollToGridEnd(page);
  await waitForCountersDone(page);
  for (let i = 0; i < targets.length; i++) {
    await expect(counters.nth(i)).toHaveText(targets[i] ?? "");
  }
});

test("salida: un contador ya animado no vuelve a 0 al salir del viewport", async ({ page, baseURL }) => {
  await gotoAndSettle(page, baseURL);
  await scrollToGridEnd(page);
  await waitForCountersDone(page);
  const first = page.locator("[data-count]").first();
  await expect(first).toHaveText("45");

  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
  await expect(first).toHaveText("45");
});

test("responsive: el grid pasa de 4 a 2 a 1 columnas en los breakpoints", async ({ page, baseURL }) => {
  await gotoAndSettle(page, baseURL);
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("Sin viewport");

  const grid = page.locator("[data-stats-grid]");
  const columns = (await grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns)).split(" ").length;
  const expected = viewport.width <= 640 ? 1 : viewport.width <= 900 ? 2 : 4;
  expect(columns).toBe(expected);
});

test("integración: Stats viene justo después de Principles y no marca el header on-dark", async ({
  page,
  baseURL,
}) => {
  await gotoAndSettle(page, baseURL);

  const order = await page.evaluate(() => {
    const main = document.querySelector("main");
    return Array.from(main?.children ?? []).map((el) => {
      if (el.hasAttribute("data-principles")) return "principles";
      if (el.hasAttribute("data-stats")) return "stats";
      return el.id;
    });
  });
  const principlesIdx = order.indexOf("principles");
  const statsIdx = order.indexOf("stats");
  expect(principlesIdx).toBeGreaterThanOrEqual(0);
  expect(statsIdx).toBe(principlesIdx + 1);

  await scrollToStatement(page);
  await expect(page.locator("[data-header]")).not.toHaveClass(/onDark/);
});

test("integración con NoiseOverlay: sigue presente sobre Stats", async ({ page, baseURL }) => {
  await gotoAndSettle(page, baseURL);
  await scrollToStatement(page);
  const noise = page.locator('[data-shell="noise"]');
  await expect(noise).toBeAttached();
  await expect(noise).toHaveCSS("z-index", "1000");
});

test("integración con CustomCursor: los contadores no activan el texto del cursor (fidelidad)", async ({
  page,
  baseURL,
}) => {
  await gotoAndSettle(page, baseURL);
  await scrollToStatement(page);
  const counters = page.locator("[data-count]");
  const count = await counters.count();
  for (let i = 0; i < count; i++) {
    await expect(counters.nth(i)).not.toHaveAttribute("data-cursor", /.*/);
  }
});
