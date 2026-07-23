import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { compareScreenshots } from "./utils/diff";

const ORACLE_DIR = path.join(__dirname, "oracle");
const CAPTURES_DIR = path.join(__dirname, "__captures__");
const PARITY_THRESHOLD = 0.001;

async function scrollToSolutions(page: import("@playwright/test").Page) {
  await page.evaluate(() => {
    const el = document.getElementById("soluciones");
    if (el) window.scrollTo({ top: el.offsetTop, left: 0, behavior: "instant" });
  });
}

// ---------------------------------------------------------------------
// Paridad visual
// ---------------------------------------------------------------------

test("solutions: paridad visual en el estado inicial (servicio 1 activo)", async ({ page, baseURL }, testInfo) => {
  const oraclePath = path.join(ORACLE_DIR, `solutions-${testInfo.project.name}-home.png`);
  test.skip(
    !existsSync(oraclePath),
    `No existe oráculo para "solutions-${testInfo.project.name}". Ejecuta "npm run parity:update-oracle-solutions".`,
  );
  const oracleBuf = readFileSync(oraclePath);

  await page.goto(new URL("/", baseURL).href);
  await page.waitForSelector('[data-shell="preloader"]', { state: "hidden", timeout: 3000 }).catch(() => {});
  await scrollToSolutions(page);
  await page.waitForTimeout(500);

  const currentBuf = await page.screenshot();
  mkdirSync(path.join(CAPTURES_DIR, "current"), { recursive: true });
  writeFileSync(path.join(CAPTURES_DIR, "current", `solutions-${testInfo.project.name}-home.png`), currentBuf);

  const diffPath = path.join(CAPTURES_DIR, "diff", `solutions-${testInfo.project.name}-home.png`);
  const { diffRatio, diffPixels, totalPixels } = compareScreenshots(oracleBuf, currentBuf, diffPath);
  await testInfo.attach(`diff-solutions-${testInfo.project.name}`, { path: diffPath, contentType: "image/png" });
  console.log(`[solutions] ${testInfo.project.name}: ${(diffRatio * 100).toFixed(3)}% (${diffPixels}/${totalPixels}px)`);

  expect(diffRatio, "paridad visual de Solutions — revisa el diff adjunto").toBeLessThan(PARITY_THRESHOLD);
});

// ---------------------------------------------------------------------
// Comportamiento
// ---------------------------------------------------------------------

test("estado inicial: el servicio 1 está activo, el resto cerrados", async ({ page, baseURL }) => {
  await page.goto(new URL("/", baseURL).href);
  const buttons = page.locator("#soluciones article button");
  const panels = page.locator("#soluciones article > div:nth-child(2)");

  await expect(buttons.nth(0)).toHaveAttribute("aria-expanded", "true");
  await expect(panels.nth(0)).toHaveCSS("height", /^(?!0px$).+/);

  for (let i = 1; i < 4; i++) {
    await expect(buttons.nth(i)).toHaveAttribute("aria-expanded", "false");
    await expect(panels.nth(i)).toHaveCSS("height", "0px");
  }
});

test("interacción: abrir un servicio cierra el que estaba activo (acordeón de apertura única)", async ({
  page,
  baseURL,
}) => {
  await page.goto(new URL("/", baseURL).href);
  const buttons = page.locator("#soluciones article button");
  const panels = page.locator("#soluciones article > div:nth-child(2)");

  await buttons.nth(2).click();
  await expect(buttons.nth(2)).toHaveAttribute("aria-expanded", "true");
  await expect(buttons.nth(0)).toHaveAttribute("aria-expanded", "false");

  await expect.poll(() => panels.nth(0).evaluate((el) => getComputedStyle(el).height)).toBe("0px");
  await expect.poll(() => panels.nth(2).evaluate((el) => getComputedStyle(el).height)).not.toBe("0px");
});

test("interacción: pulsar el servicio activo lo cierra (toggle-off)", async ({ page, baseURL }) => {
  await page.goto(new URL("/", baseURL).href);
  const buttons = page.locator("#soluciones article button");
  const panels = page.locator("#soluciones article > div:nth-child(2)");

  await expect(buttons.nth(0)).toHaveAttribute("aria-expanded", "true");
  await buttons.nth(0).click();
  await expect(buttons.nth(0)).toHaveAttribute("aria-expanded", "false");
  await expect.poll(() => panels.nth(0).evaluate((el) => getComputedStyle(el).height)).toBe("0px");
});

test("animaciones: el icono rota 90deg en el servicio activo y usa una transición de 0.75s en el panel", async ({
  page,
  baseURL,
}) => {
  await page.goto(new URL("/", baseURL).href);
  const firstArticle = page.locator("#soluciones article").first();
  const icon = firstArticle.locator("button > span").last();
  const panel = firstArticle.locator("> div"); // único div hijo directo del article (el panel)

  await expect(icon).toHaveCSS("transform", "matrix(0, 1, -1, 0, 0, 0)"); // rotate(90deg)
  await expect(panel).toHaveCSS("transition-duration", "0.75s");
});

test("responsive: el grid del encabezado y del botón cambian en los breakpoints", async ({ page, baseURL }) => {
  await page.goto(new URL("/", baseURL).href);
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("Sin viewport");

  const header = page.locator("#soluciones > div").first();
  const headerColumns = (await header.evaluate((el) => getComputedStyle(el).gridTemplateColumns)).split(" ").length;
  expect(headerColumns).toBe(viewport.width <= 900 ? 1 : 2);

  const button = page.locator("#soluciones article button").first();
  const buttonColumns = (await button.evaluate((el) => getComputedStyle(el).gridTemplateColumns)).split(" ").length;
  expect(buttonColumns).toBe(3); // 100px/55px 1fr auto -- 3 columnas en todos los breakpoints, cambia el ancho
});

test("continuidad: Solutions viene justo después de Manifesto y usa fondo oscuro", async ({ page, baseURL }) => {
  await page.goto(new URL("/", baseURL).href);
  const order = await page.evaluate(() => {
    const main = document.querySelector("main");
    return Array.from(main?.children ?? []).map((el) => el.id);
  });
  expect(order).toEqual(["inicio", "estudio", "soluciones"]);

  const bg = await page.locator("#soluciones").evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).toBe("rgb(17, 17, 15)"); // var(--ink)
});

test("integración con Header: al hacer scroll hasta Solutions, el header pasa a on-dark", async ({
  page,
  baseURL,
}) => {
  await page.goto(new URL("/", baseURL).href);
  await page.waitForSelector('[data-shell="preloader"]', { state: "hidden", timeout: 3000 }).catch(() => {});
  const header = page.locator("[data-header]");
  await expect(header).not.toHaveClass(/onDark/);

  await scrollToSolutions(page);
  await expect(header).toHaveClass(/onDark/);

  // Volver arriba (Hero) debe quitar on-dark otra vez.
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
  await expect(header).not.toHaveClass(/onDark/);
});

test("integración con NoiseOverlay: sigue presente sobre Solutions", async ({ page, baseURL }) => {
  await page.goto(new URL("/", baseURL).href);
  await scrollToSolutions(page);
  const noise = page.locator('[data-shell="noise"]');
  await expect(noise).toBeAttached();
  await expect(noise).toHaveCSS("z-index", "1000");
});

test("integración con CustomCursor: los botones de servicio no activan el texto del cursor (fidelidad)", async ({
  page,
  baseURL,
}) => {
  await page.goto(new URL("/", baseURL).href);
  await scrollToSolutions(page);
  const buttons = page.locator("#soluciones article button");
  const count = await buttons.count();
  for (let i = 0; i < count; i++) {
    await expect(buttons.nth(i)).not.toHaveAttribute("data-cursor", /.*/);
  }
});
