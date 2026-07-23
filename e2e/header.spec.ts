import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { isolateHeader } from "./utils/settle";
import { compareScreenshots } from "./utils/diff";

const ORACLE_DIR = path.join(__dirname, "oracle");
const CAPTURES_DIR = path.join(__dirname, "__captures__");
const PARITY_THRESHOLD = 0.001;
const MOBILE_MENU_MAX_WIDTH = 900;

// El nombre del proyecto de Playwright codifica el ancho (ver e2e/matrix.ts:
// "mobile-375", "desktop-1440-reduced"...). Evita duplicar la matriz aquí.
function viewportHasToggle(projectName: string): boolean {
  const width = Number(projectName.match(/-(\d+)(?:-reduced)?$/)?.[1]);
  return Number.isFinite(width) && width <= MOBILE_MENU_MAX_WIDTH;
}

// Sin contenido de home todavía, el body no tiene altura de sobra —
// window.scrollTo no tiene nada que desplazar. Se añade un espaciador
// sintético para poder probar isScrolled/isHidden de forma realista.
async function addScrollSpacer(page: import("@playwright/test").Page) {
  await page.evaluate(() => {
    const spacer = document.createElement("div");
    spacer.id = "scroll-spacer";
    spacer.style.cssText = "height:3000px;";
    document.body.appendChild(spacer);
  });
}

// html{scroll-behavior:smooth} (reset.css) hace que window.scrollTo anime
// el desplazamiento; saltos sucesivos rápidos se solapan y dejan scrollY en
// valores intermedios impredecibles. behavior:"instant" lo evita.
async function scrollTo(page: import("@playwright/test").Page, y: number) {
  await page.evaluate((top) => window.scrollTo({ top, left: 0, behavior: "instant" }), y);
}

// ---------------------------------------------------------------------
// Paridad visual
// ---------------------------------------------------------------------

test("header: paridad visual en el estado inicial (aislado)", async ({ page, baseURL }, testInfo) => {
  const oraclePath = path.join(ORACLE_DIR, `header-${testInfo.project.name}-home.png`);
  test.skip(!existsSync(oraclePath), `No existe oráculo para "header-${testInfo.project.name}". Ejecuta "npm run parity:update-oracle-header".`);
  const oracleBuf = readFileSync(oraclePath);

  await page.goto(new URL("/", baseURL).href);
  await page.waitForSelector('[data-shell="preloader"]', { state: "hidden", timeout: 3000 }).catch(() => {});
  await isolateHeader(page);

  const box = await page.locator("[data-header]").boundingBox();
  if (!box) throw new Error("No se pudo medir el header");
  const currentBuf = await page.screenshot({ clip: { x: 0, y: 0, width: box.width, height: box.height } });

  mkdirSync(path.join(CAPTURES_DIR, "current"), { recursive: true });
  writeFileSync(path.join(CAPTURES_DIR, "current", `header-${testInfo.project.name}-home.png`), currentBuf);

  const diffPath = path.join(CAPTURES_DIR, "diff", `header-${testInfo.project.name}-home.png`);
  const { diffRatio, diffPixels, totalPixels } = compareScreenshots(oracleBuf, currentBuf, diffPath);
  await testInfo.attach(`diff-header-${testInfo.project.name}`, { path: diffPath, contentType: "image/png" });
  console.log(`[header] ${testInfo.project.name}: ${(diffRatio * 100).toFixed(3)}% (${diffPixels}/${totalPixels}px)`);

  expect(diffRatio, "paridad visual del header — revisa el diff adjunto").toBeLessThan(PARITY_THRESHOLD);
});

test("mobile-menu: paridad visual abierto", async ({ page, baseURL }, testInfo) => {
  test.skip(
    !viewportHasToggle(testInfo.project.name),
    "El botón de menú solo existe en viewports ≤900px",
  );

  const oraclePath = path.join(ORACLE_DIR, `mobile-menu-open-${testInfo.project.name}-home.png`);
  test.skip(!existsSync(oraclePath), `No existe oráculo para "mobile-menu-open-${testInfo.project.name}".`);
  const oracleBuf = readFileSync(oraclePath);

  await page.goto(new URL("/", baseURL).href);
  await page.waitForSelector('[data-shell="preloader"]', { state: "hidden", timeout: 3000 }).catch(() => {});
  await page.click('[aria-controls="mobile-menu"]');
  await page.waitForTimeout(900); // transición de apertura: 0.8s

  const currentBuf = await page.screenshot();
  mkdirSync(path.join(CAPTURES_DIR, "current"), { recursive: true });
  writeFileSync(path.join(CAPTURES_DIR, "current", `mobile-menu-open-${testInfo.project.name}-home.png`), currentBuf);

  const diffPath = path.join(CAPTURES_DIR, "diff", `mobile-menu-open-${testInfo.project.name}-home.png`);
  const { diffRatio, diffPixels, totalPixels } = compareScreenshots(oracleBuf, currentBuf, diffPath);
  await testInfo.attach(`diff-mobile-menu-${testInfo.project.name}`, { path: diffPath, contentType: "image/png" });
  console.log(`[mobile-menu] ${testInfo.project.name}: ${(diffRatio * 100).toFixed(3)}% (${diffPixels}/${totalPixels}px)`);

  expect(diffRatio, "paridad visual del menú móvil — revisa el diff adjunto").toBeLessThan(PARITY_THRESHOLD);
});

// ---------------------------------------------------------------------
// Comportamiento — escritorio (solo proyectos >900px)
// ---------------------------------------------------------------------

test.describe("comportamiento de escritorio", () => {
  test("nav de escritorio visible, botón de menú oculto", async ({ page, baseURL }, testInfo) => {
    test.skip(viewportHasToggle(testInfo.project.name), "Solo aplica >900px");
    await page.goto(new URL("/", baseURL).href);
    await expect(page.getByRole("navigation", { name: "Navegación principal" })).toBeVisible();
    await expect(page.locator('[aria-controls="mobile-menu"]')).toBeHidden();
  });

  test("se marca is-scrolled al superar 20px", async ({ page, baseURL }, testInfo) => {
    test.skip(viewportHasToggle(testInfo.project.name), "Solo aplica >900px");
    await page.goto(new URL("/", baseURL).href);
    await addScrollSpacer(page);
    const header = page.locator("[data-header]");

    const initialBg = await header.evaluate((el) => getComputedStyle(el).backgroundColor);
    await scrollTo(page, 100);
    await expect
      .poll(() => header.evaluate((el) => getComputedStyle(el).backgroundColor))
      .not.toBe(initialBg);
  });

  test("se oculta al hacer scroll hacia abajo pasados 500px y reaparece al subir", async ({ page, baseURL }, testInfo) => {
    test.skip(viewportHasToggle(testInfo.project.name), "Solo aplica >900px");
    await page.goto(new URL("/", baseURL).href);
    await addScrollSpacer(page);
    const header = page.locator("[data-header]");

    await scrollTo(page, 300);
    await scrollTo(page, 900);
    // .header no declara transform propio; solo .isHidden lo añade
    // (translateY(-100%)), así que "deja de ser none" basta para detectarlo
    // sin depender de a cuántos píxeles equivale ese -100% (86px o 72px
    // según el breakpoint de altura del header).
    await expect.poll(() => header.evaluate((el) => getComputedStyle(el).transform)).not.toBe("none");

    await scrollTo(page, 850);
    await expect.poll(() => header.evaluate((el) => getComputedStyle(el).transform)).toBe("none");
  });

  test("hover en un enlace de navegación activa el subrayado", async ({ page, baseURL }, testInfo) => {
    test.skip(viewportHasToggle(testInfo.project.name), "Solo aplica >900px");
    await page.goto(new URL("/", baseURL).href);
    const link = page.getByRole("navigation", { name: "Navegación principal" }).getByRole("link", { name: "Nosotros" });

    const before = await link.evaluate((el) => getComputedStyle(el, "::after").transform);
    await link.hover();
    await expect
      .poll(() => link.evaluate((el) => getComputedStyle(el, "::after").transform))
      .not.toBe(before);
  });
});

// ---------------------------------------------------------------------
// Comportamiento — móvil (solo proyectos ≤900px)
// ---------------------------------------------------------------------

test.describe("comportamiento móvil y menú", () => {
  test("nav de escritorio oculto, botón de menú visible", async ({ page, baseURL }, testInfo) => {
    test.skip(!viewportHasToggle(testInfo.project.name), "Solo aplica ≤900px");
    await page.goto(new URL("/", baseURL).href);
    await expect(page.getByRole("navigation", { name: "Navegación principal" })).toBeHidden();
    await expect(page.locator('[aria-controls="mobile-menu"]')).toBeVisible();
  });

  test("abre y cierra con el botón de menú", async ({ page, baseURL }, testInfo) => {
    test.skip(!viewportHasToggle(testInfo.project.name), "Solo aplica ≤900px");
    await page.goto(new URL("/", baseURL).href);
    const toggle = page.locator('[aria-controls="mobile-menu"]');
    const menu = page.locator("#mobile-menu");

    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(menu).toHaveAttribute("aria-hidden", "true");

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(menu).toHaveAttribute("aria-hidden", "false");
    await expect(menu).toBeVisible();

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(menu).toHaveAttribute("aria-hidden", "true");
  });

  test("se cierra al pulsar un enlace interno", async ({ page, baseURL }, testInfo) => {
    test.skip(!viewportHasToggle(testInfo.project.name), "Solo aplica ≤900px");
    await page.goto(new URL("/", baseURL).href);
    const toggle = page.locator('[aria-controls="mobile-menu"]');
    const menu = page.locator("#mobile-menu");

    await toggle.click();
    await expect(menu).toHaveAttribute("aria-hidden", "false");

    await menu.getByRole("link", { name: /Inicio/ }).click();
    await expect(menu).toHaveAttribute("aria-hidden", "true");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  test("bloquea el scroll del body mientras está abierto", async ({ page, baseURL }, testInfo) => {
    test.skip(!viewportHasToggle(testInfo.project.name), "Solo aplica ≤900px");
    await page.goto(new URL("/", baseURL).href);
    const toggle = page.locator('[aria-controls="mobile-menu"]');

    await expect(page.locator("body")).not.toHaveClass(/no-scroll/);
    await toggle.click();
    await expect(page.locator("body")).toHaveClass(/no-scroll/);
    await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
    await toggle.click();
    await expect(page.locator("body")).not.toHaveClass(/no-scroll/);
  });
});

// ---------------------------------------------------------------------
// Navegación (rutas) — independiente del viewport
// ---------------------------------------------------------------------

test("navegación: los enlaces apuntan a las rutas esperadas", async ({ page, baseURL }) => {
  await page.goto(new URL("/", baseURL).href);

  await expect(page.locator('[data-header] a', { hasText: "REFERENCE" }).first()).toHaveAttribute("href", "/");

  const expected: Record<string, string> = {
    Inicio: "/",
    Nosotros: "/nosotros",
    Proyectos: "/proyectos",
    Contacto: "/contacto",
  };
  for (const [label, href] of Object.entries(expected)) {
    const link = page.locator(`a:has-text("${label}")`).first();
    await expect(link).toHaveAttribute("href", href);
  }
});

test("navegación: el foco por teclado alcanza los enlaces de escritorio", async ({ page, baseURL }, testInfo) => {
  test.skip(viewportHasToggle(testInfo.project.name), "El nav de escritorio no es interactivo en móvil");
  await page.goto(new URL("/", baseURL).href);

  const firstLink = page.getByRole("navigation", { name: "Navegación principal" }).getByRole("link").first();
  await firstLink.focus();
  await expect(firstLink).toBeFocused();
});
