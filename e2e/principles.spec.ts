import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { test, expect, type Page } from "@playwright/test";
import { compareScreenshots } from "./utils/diff";
import { waitForStable } from "./utils/settle";

const ORACLE_DIR = path.join(__dirname, "oracle");
const CAPTURES_DIR = path.join(__dirname, "__captures__");
const PARITY_THRESHOLD = 0.001;

async function readPrinciplesFrame(page: Page): Promise<string> {
  return page.evaluate(() => {
    const items = Array.from(document.querySelectorAll("[data-reveal]"));
    return items
      .map((el) => {
        const style = getComputedStyle(el);
        return `${style.opacity}|${style.transform}`;
      })
      .join(";");
  });
}

async function scrollListIntoView(page: Page) {
  // Ver capture-oracle-principles.ts: primero el final de la lista (para
  // que los 4 elementos disparen su revelación pase lo que pase con la
  // altura del viewport), luego se reencuadra al inicio de la lista para
  // la captura -- el estado revelado persiste independientemente del
  // encuadre final.
  await page.evaluate(() => {
    const list = document.querySelector("[data-reveal-list]") as HTMLElement | null;
    if (!list) return;
    const bottom = list.offsetTop + list.offsetHeight - window.innerHeight;
    window.scrollTo({ top: Math.max(0, bottom), left: 0, behavior: "instant" });
  });
}

async function scrollListToTop(page: Page) {
  // Encuadre en el inicio de LA SECCIÓN, no de la lista: ver el mismo
  // razonamiento en capture-oracle-principles.ts -- mientras el proyecto
  // migrado no tenga las secciones posteriores a Principles, su altura
  // total de página es menor que la del oráculo completo, y un scroll
  // cercano al final de la página puede quedar recortado de forma
  // distinta en cada lado. [data-principles] deja margen de sobra.
  await page.evaluate(() => {
    const section = document.querySelector("[data-principles]") as HTMLElement | null;
    if (section) window.scrollTo({ top: section.offsetTop, left: 0, behavior: "instant" });
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

test("principles: paridad visual con los 4 elementos revelados", async ({ page, baseURL }, testInfo) => {
  const oraclePath = path.join(ORACLE_DIR, `principles-${testInfo.project.name}-home.png`);
  test.skip(
    !existsSync(oraclePath),
    `No existe oráculo para "principles-${testInfo.project.name}". Ejecuta "npm run parity:update-oracle-principles".`,
  );
  const oracleBuf = readFileSync(oraclePath);

  await gotoAndSettle(page, baseURL);
  await scrollListIntoView(page);
  await page.waitForFunction(
    () => Array.from(document.querySelectorAll("[data-reveal]")).every((el) => el.hasAttribute("data-visible")),
    undefined,
    { timeout: 5000 },
  );
  await scrollListToTop(page);
  await waitForStable(() => readPrinciplesFrame(page));

  const currentBuf = await page.screenshot();
  mkdirSync(path.join(CAPTURES_DIR, "current"), { recursive: true });
  writeFileSync(path.join(CAPTURES_DIR, "current", `principles-${testInfo.project.name}-home.png`), currentBuf);

  const diffPath = path.join(CAPTURES_DIR, "diff", `principles-${testInfo.project.name}-home.png`);
  const { diffRatio, diffPixels, totalPixels } = compareScreenshots(oracleBuf, currentBuf, diffPath);
  await testInfo.attach(`diff-principles-${testInfo.project.name}`, { path: diffPath, contentType: "image/png" });
  console.log(`[principles] ${testInfo.project.name}: ${(diffRatio * 100).toFixed(3)}% (${diffPixels}/${totalPixels}px)`);

  expect(diffRatio, "paridad visual de Principles — revisa el diff adjunto").toBeLessThan(PARITY_THRESHOLD);
});

// ---------------------------------------------------------------------
// Comportamiento
// ---------------------------------------------------------------------

test("estado inicial: los 4 elementos empiezan ocultos (sin data-visible)", async ({ page, baseURL }) => {
  await gotoAndSettle(page, baseURL);
  const items = page.locator("[data-reveal]");
  await expect(items).toHaveCount(4);
  for (let i = 0; i < 4; i++) {
    await expect(items.nth(i)).not.toHaveAttribute("data-visible", /.*/);
  }
});

test("entrada: cada elemento se revela por separado al entrar en el viewport", async ({ page, baseURL }) => {
  await gotoAndSettle(page, baseURL);
  const items = page.locator("[data-reveal]");

  // Antes de hacer scroll, ninguno está revelado.
  await expect(items.nth(0)).not.toHaveAttribute("data-visible", /.*/);
  await expect(items.nth(3)).not.toHaveAttribute("data-visible", /.*/);

  // Al llevar el primer elemento a la vista, se revela sin afectar a los
  // que siguen fuera del viewport.
  await items.nth(0).scrollIntoViewIfNeeded();
  await expect(items.nth(0)).toHaveAttribute("data-visible", "true");
});

test("salida: un elemento revelado no vuelve a ocultarse al salir del viewport", async ({ page, baseURL }) => {
  await gotoAndSettle(page, baseURL);
  const items = page.locator("[data-reveal]");

  await items.nth(0).scrollIntoViewIfNeeded();
  await expect(items.nth(0)).toHaveAttribute("data-visible", "true");

  // Volver arriba del todo saca el elemento del viewport otra vez.
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
  await expect(items.nth(0)).toHaveAttribute("data-visible", "true");
});

test("responsive: la rejilla de cada elemento cambia de 3 a 2 columnas en el breakpoint de 640px", async ({
  page,
  baseURL,
}) => {
  await gotoAndSettle(page, baseURL);
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("Sin viewport");

  const item = page.locator("[data-reveal]").first();
  const columns = (await item.evaluate((el) => getComputedStyle(el).gridTemplateColumns)).split(" ").length;
  expect(columns).toBe(viewport.width <= 640 ? 2 : 3);
});

test("integración: Principles viene justo después de BrandStory y no marca el header on-dark", async ({
  page,
  baseURL,
}) => {
  await gotoAndSettle(page, baseURL);

  const order = await page.evaluate(() => {
    const main = document.querySelector("main");
    return Array.from(main?.children ?? []).map((el) => {
      if (el.hasAttribute("data-brand-story")) return "brandstory";
      if (el.hasAttribute("data-principles")) return "principles";
      return el.id;
    });
  });
  const brandstoryIdx = order.indexOf("brandstory");
  const principlesIdx = order.indexOf("principles");
  expect(brandstoryIdx).toBeGreaterThanOrEqual(0);
  expect(principlesIdx).toBe(brandstoryIdx + 1);

  await scrollListIntoView(page);
  await expect(page.locator("[data-header]")).not.toHaveClass(/onDark/);
});

test("integración con NoiseOverlay: sigue presente sobre Principles", async ({ page, baseURL }) => {
  await gotoAndSettle(page, baseURL);
  await scrollListToTop(page);
  const noise = page.locator('[data-shell="noise"]');
  await expect(noise).toBeAttached();
  await expect(noise).toHaveCSS("z-index", "1000");
});

test("integración con CustomCursor: los elementos no activan el texto del cursor (fidelidad)", async ({
  page,
  baseURL,
}) => {
  await gotoAndSettle(page, baseURL);
  await scrollListToTop(page);
  const items = page.locator("[data-reveal]");
  const count = await items.count();
  for (let i = 0; i < count; i++) {
    await expect(items.nth(i)).not.toHaveAttribute("data-cursor", /.*/);
  }
});
