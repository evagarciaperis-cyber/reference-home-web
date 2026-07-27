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
//
// Causa real de la flakiness histórica de "se oculta al hacer scroll
// hacia abajo..." (investigada a fondo en la fase 16, con logging
// temporal dentro de useHeaderState): dos scrollTo() consecutivos sin
// esperar entre medias no dan tiempo al navegador a despachar el evento
// 'scroll' del PRIMER salto antes de aplicar el segundo -- ambos acaban
// viendo el mismo scrollY final (el segundo, no el primero), así que
// useHeaderState calcula "y > lastScroll" como falso (900 no es mayor que
// 900) y el header nunca se oculta. No es un defecto de useHeaderState:
// reproducido también revirtiendo temporalmente el hook a su versión de
// la fase 3 (ver fase 10), mismo resultado. Un usuario real haciendo
// scroll nunca "salta" así -- dispara muchos eventos 'scroll' pequeños,
// cada uno con la posición real de ese instante. Se espera aquí a que el
// evento 'scroll' resultante se dispare de verdad antes de devolver el
// control, en vez de asumir que la posición ya quedó "vista".
async function scrollTo(page: import("@playwright/test").Page, y: number) {
  await page.evaluate((top) => {
    return new Promise<void>((resolve) => {
      if (Math.round(window.scrollY) === Math.round(top)) {
        resolve();
        return;
      }
      window.addEventListener("scroll", () => resolve(), { once: true });
      window.scrollTo({ top, left: 0, behavior: "instant" });
    });
  }, y);
}

// ---------------------------------------------------------------------
// Paridad visual
// ---------------------------------------------------------------------
//
// Corrección 2026-07-27: estos dos tests comparan contra el oráculo de
// web-nueva/ (el sitio estático original de la migración de paridad
// estricta, Fases 0-16, cerrada hace muchas rondas). El header lleva
// varias rondas de rediseño deliberado desde entonces -- logo más
// grande, menú reubicado, copy nuevo ("Inmobiliaria en Valencia" en vez
// de "Based in Valencia") -- así que ya no hay ningún oráculo válido
// contra el que comparar: no es que falten regenerar, es que el propio
// concepto de "paridad con el sitio estático" dejó de aplicar al header,
// igual que le pasó al Hero (ver e2e/hero.legacy.spec.ts, mismo
// precedente). Se desactivan aquí en vez de borrarse, por si hiciera
// falta consultar el criterio de comparación original más adelante.

test.skip("header: paridad visual en el estado inicial (aislado) [OBSOLETO -- ver comentario de arriba]", async ({
  page,
  baseURL,
}, testInfo) => {
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

test.skip("mobile-menu: paridad visual abierto [OBSOLETO -- ver comentario junto al test de header de arriba]", async ({
  page,
  baseURL,
}, testInfo) => {
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

  test("permanece fijo y visible durante todo el scroll, sin ocultarse ni desvanecerse", async ({ page, baseURL }, testInfo) => {
    test.skip(viewportHasToggle(testInfo.project.name), "Solo aplica >900px");
    await page.goto(new URL("/", baseURL).href);
    await page.waitForSelector('[data-shell="preloader"]', { state: "hidden", timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(300);
    await addScrollSpacer(page);
    const header = page.locator("[data-header]");

    // Corrección: el header es una barra fija normal -- nunca se oculta
    // (transform), ni se desvanece (opacity), ni cambia de posición,
    // pase lo que pase con el scroll (antes había un umbral a los 500px
    // que lo ocultaba; ya no existe ninguna lógica de ese tipo).
    for (const y of [300, 900, 2500, 850, 0]) {
      await scrollTo(page, y);
      await expect(header).toHaveCSS("transform", "none");
      await expect(header).toHaveCSS("opacity", "1");
      await expect(header).toHaveCSS("position", "fixed");
    }
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

  await expect(page.locator('[data-header] a[aria-label="Volver al inicio"]')).toHaveAttribute("href", "/");

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
