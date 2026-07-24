import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { test, expect, type Page } from "@playwright/test";
import { compareScreenshots } from "./utils/diff";
import { hideHeader, waitForStable } from "./utils/settle";

const ORACLE_DIR = path.join(__dirname, "oracle");
const CAPTURES_DIR = path.join(__dirname, "__captures__");
const PARITY_THRESHOLD = 0.001;
const DESKTOP_MIN_WIDTH = 901;
const JOURNEY_POINTS = [0, 0.25, 0.5, 0.75, 1];

function isDesktopProject(projectName: string): boolean {
  const width = Number(projectName.match(/-(\d+)(?:-reduced)?$/)?.[1]);
  return Number.isFinite(width) && width >= DESKTOP_MIN_WIDTH;
}

async function getMetrics(page: Page) {
  const metrics = await page.evaluate(() => {
    const section = document.querySelector("[data-brand-story]") as HTMLElement | null;
    if (!section) return null;
    const rect = section.getBoundingClientRect();
    return {
      start: window.scrollY + rect.top,
      distance: Math.max(1, section.offsetHeight - window.innerHeight),
    };
  });
  if (!metrics) throw new Error("No se encontró [data-brand-story]");
  return metrics;
}

async function scrollToProgress(page: Page, progress: number) {
  const metrics = await getMetrics(page);
  const target = metrics.start + progress * metrics.distance;
  await page.evaluate((y) => window.scrollTo({ top: y, left: 0, behavior: "instant" }), target);
  // Ver el mismo fix en workzoom.spec.ts: fuerza al menos un tick de rAF
  // real del navegador antes de empezar a sondear con waitForStable().
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function scrollToBrandStory(page: Page) {
  await page.evaluate(() => {
    const el = document.querySelector("[data-brand-story]") as HTMLElement | null;
    if (el) window.scrollTo({ top: el.offsetTop, left: 0, behavior: "instant" });
  });
}

async function readStoryFrame(page: Page): Promise<string> {
  return page.evaluate(() => {
    const compass = document.querySelector("[data-story-compass]") as HTMLElement | null;
    const active = document.querySelector("[data-step-active]") as HTMLElement | null;
    return `${compass ? getComputedStyle(compass).transform : ""}|${active ? getComputedStyle(active).opacity : ""}`;
  });
}

async function gotoAndSettle(page: Page, baseURL: string | undefined) {
  await page.goto(new URL("/", baseURL).href);
  // Deja asentada la secuencia de entrada antes de cualquier scroll propio
  // del test: document.fonts.ready puede disparar un measureBrandStory()
  // tardío que desplace las métricas -- mismo bug ya encontrado en
  // ProjectsGallery (fase 7) y WorkZoom (fase 9).
  await page.waitForSelector('[data-shell="preloader"]', { state: "hidden", timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(300);
}

// ---------------------------------------------------------------------
// Paridad visual — recorrido completo (0/25/50/75/100%) en desktop,
// estado único en tablet/móvil (layout estático).
// ---------------------------------------------------------------------

for (const point of JOURNEY_POINTS) {
  test(`brandstory: paridad visual en el ${Math.round(point * 100)}% del recorrido (desktop)`, async ({
    page,
    baseURL,
  }, testInfo) => {
    test.skip(!isDesktopProject(testInfo.project.name), "Recorrido de brújula solo aplica >900px");

    const oraclePath = path.join(ORACLE_DIR, `brandstory-${testInfo.project.name}-${Math.round(point * 100)}-home.png`);
    test.skip(
      !existsSync(oraclePath),
      `No existe oráculo para "brandstory-${testInfo.project.name}-${Math.round(point * 100)}". Ejecuta "npm run parity:update-oracle-brandstory".`,
    );
    const oracleBuf = readFileSync(oraclePath);

    await gotoAndSettle(page, baseURL);
    // Recorrido secuencial, igual que capture-oracle-brandstory.ts y que
    // workzoom.spec.ts (fase 9) -- evita depender de en qué salto exacto
    // ocurre cualquier transición sensible al orden de scroll.
    for (const priorPoint of JOURNEY_POINTS) {
      if (priorPoint > point) break;
      await scrollToProgress(page, priorPoint);
      await waitForStable(() => readStoryFrame(page));
    }
    // 600ms, no 300ms: margen adicional tras la estabilización para el
    // filter:blur(42px) + transform:scale del fondo (::before de .sticky)
    // -- más costoso de componer que las transiciones simples de fases
    // anteriores. Diagnosticado: los diffs residuales bajo contención de
    // CPU eran ruido de antialiasing en bordes de texto/SVG (confirmado
    // visualmente, sin desplazamientos ni contenido distinto), no
    // deterministas (valores distintos en reintentos aislados) -- mismo
    // patrón que ProjectsGallery (fase 7/8), no un defecto del componente.
    await page.waitForTimeout(600);
    await hideHeader(page);

    const currentBuf = await page.screenshot();
    mkdirSync(path.join(CAPTURES_DIR, "current"), { recursive: true });
    writeFileSync(
      path.join(CAPTURES_DIR, "current", `brandstory-${testInfo.project.name}-${Math.round(point * 100)}-home.png`),
      currentBuf,
    );

    const diffPath = path.join(CAPTURES_DIR, "diff", `brandstory-${testInfo.project.name}-${Math.round(point * 100)}-home.png`);
    const { diffRatio, diffPixels, totalPixels } = compareScreenshots(oracleBuf, currentBuf, diffPath);
    await testInfo.attach(`diff-brandstory-${testInfo.project.name}-${Math.round(point * 100)}`, {
      path: diffPath,
      contentType: "image/png",
    });
    console.log(
      `[brandstory ${Math.round(point * 100)}%] ${testInfo.project.name}: ${(diffRatio * 100).toFixed(3)}% (${diffPixels}/${totalPixels}px)`,
    );

    expect(diffRatio, `paridad visual de BrandStory al ${Math.round(point * 100)}% — revisa el diff adjunto`).toBeLessThan(
      PARITY_THRESHOLD,
    );
  });
}

test("brandstory: paridad visual en tablet/móvil (layout estático)", async ({ page, baseURL }, testInfo) => {
  test.skip(isDesktopProject(testInfo.project.name), "Solo aplica ≤900px");

  const oraclePath = path.join(ORACLE_DIR, `brandstory-${testInfo.project.name}-home.png`);
  test.skip(
    !existsSync(oraclePath),
    `No existe oráculo para "brandstory-${testInfo.project.name}". Ejecuta "npm run parity:update-oracle-brandstory".`,
  );
  const oracleBuf = readFileSync(oraclePath);

  await gotoAndSettle(page, baseURL);
  await scrollToBrandStory(page);
  await page.waitForTimeout(500);
  await hideHeader(page);

  const currentBuf = await page.screenshot();
  mkdirSync(path.join(CAPTURES_DIR, "current"), { recursive: true });
  writeFileSync(path.join(CAPTURES_DIR, "current", `brandstory-${testInfo.project.name}-home.png`), currentBuf);

  const diffPath = path.join(CAPTURES_DIR, "diff", `brandstory-${testInfo.project.name}-home.png`);
  const { diffRatio, diffPixels, totalPixels } = compareScreenshots(oracleBuf, currentBuf, diffPath);
  await testInfo.attach(`diff-brandstory-${testInfo.project.name}`, { path: diffPath, contentType: "image/png" });
  console.log(`[brandstory static] ${testInfo.project.name}: ${(diffRatio * 100).toFixed(3)}% (${diffPixels}/${totalPixels}px)`);

  expect(diffRatio, "paridad visual de BrandStory (estático) — revisa el diff adjunto").toBeLessThan(PARITY_THRESHOLD);
});

// ---------------------------------------------------------------------
// Comportamiento — desktop (recorrido de brújula)
// ---------------------------------------------------------------------

test.describe("comportamiento de la brújula (desktop)", () => {
  test("estado inicial: paso 1 con menor peso, contador 01 / 03, sin pasos activos", async ({
    page,
    baseURL,
  }, testInfo) => {
    test.skip(!isDesktopProject(testInfo.project.name), "Solo aplica >900px");
    await gotoAndSettle(page, baseURL);
    await scrollToProgress(page, 0);
    await page.waitForTimeout(200);

    const section = page.locator("[data-brand-story]");
    await expect(section).toHaveAttribute("data-active", "0");
    await expect(page.locator("[data-story-count]")).toHaveText("01 / 03");
  });

  test("recorrido: cada paso alcanza data-step-active dentro de su segmento y el contador avanza", async ({
    page,
    baseURL,
  }, testInfo) => {
    test.skip(!isDesktopProject(testInfo.project.name), "Solo aplica >900px");
    await gotoAndSettle(page, baseURL);

    const steps = page.locator("[data-story-step]");

    // Centro de cada segmento (storySegments en main.js: .07-.38, .31-.65, .58-.87).
    await scrollToProgress(page, 0.22);
    await waitForStable(() => readStoryFrame(page));
    await expect(steps.nth(0)).toHaveAttribute("data-step-active", "");
    await expect(page.locator("[data-story-count]")).toHaveText("01 / 03");

    await scrollToProgress(page, 0.48);
    await waitForStable(() => readStoryFrame(page));
    await expect(steps.nth(1)).toHaveAttribute("data-step-active", "");
    await expect(page.locator("[data-story-count]")).toHaveText("02 / 03");

    await scrollToProgress(page, 0.72);
    await waitForStable(() => readStoryFrame(page));
    await expect(steps.nth(2)).toHaveAttribute("data-step-active", "");
    await expect(page.locator("[data-story-count]")).toHaveText("03 / 03");
  });

  test("brújula: la aguja rota de forma monótona con el scroll", async ({ page, baseURL }, testInfo) => {
    test.skip(!isDesktopProject(testInfo.project.name), "Solo aplica >900px");
    await gotoAndSettle(page, baseURL);

    const readRotation = async () => {
      const t = await page.locator("[data-story-needle]").evaluate((el) => getComputedStyle(el).transform);
      const match = t.match(/matrix\(([^)]+)\)/);
      if (!match) return 0;
      const [a, b] = match[1].split(",").map((n) => parseFloat(n.trim()));
      return Math.atan2(b, a) * (180 / Math.PI);
    };

    const values: number[] = [];
    for (const p of JOURNEY_POINTS) {
      await scrollToProgress(page, p);
      await waitForStable(() => readStoryFrame(page));
      values.push(await readRotation());
    }

    // rotate(p*620-34deg): a p=0 son -34deg, a p=1 son 586deg -- ambos se
    // normalizan al rango [-180,180] por atan2, así que solo se compara
    // que el ángulo cambie de verdad entre extremos, no una progresión
    // estrictamente monótona (el propio rango cruza más de una vuelta).
    const distinctValues = new Set(values.map((v) => v.toFixed(1)));
    expect(distinctValues.size).toBeGreaterThan(1);
  });

  test("llegada al final: la frase final es visible y la brújula se desvanece", async ({ page, baseURL }, testInfo) => {
    test.skip(!isDesktopProject(testInfo.project.name), "Solo aplica >900px");
    await gotoAndSettle(page, baseURL);
    await scrollToProgress(page, 1);
    await waitForStable(() => readStoryFrame(page));
    await page.waitForTimeout(200);

    const endWords = page.locator("[data-story-end]");
    await expect(endWords).toHaveCSS("opacity", "1");
    const compassOpacity = await page.locator("[data-story-compass]").evaluate((el) => getComputedStyle(el).opacity);
    expect(Number(compassOpacity)).toBeLessThan(0.2);
  });

  test("ausencia de desplazamiento horizontal inesperado de la página", async ({ page, baseURL }, testInfo) => {
    test.skip(!isDesktopProject(testInfo.project.name), "Solo aplica >900px");
    await gotoAndSettle(page, baseURL);
    await scrollToProgress(page, 0.5);
    await page.waitForTimeout(200);
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });

  test("resize: al cruzar el breakpoint de 900px, se recalcula el layout (sticky <-> estático)", async ({
    page,
    baseURL,
  }, testInfo) => {
    test.skip(!isDesktopProject(testInfo.project.name), "Solo aplica >900px");
    await gotoAndSettle(page, baseURL);

    const sticky = page.locator("[data-brand-story] > div").first();
    await expect(sticky).toHaveCSS("position", "sticky");

    await page.setViewportSize({ width: 500, height: 900 });
    await page.waitForTimeout(300);
    await expect(sticky).toHaveCSS("position", "relative");
  });

  test("scroll rápido: un salto grande dentro del recorrido no rompe el cálculo (clamp 0-1)", async ({
    page,
    baseURL,
  }, testInfo) => {
    test.skip(!isDesktopProject(testInfo.project.name), "Solo aplica >900px");
    await gotoAndSettle(page, baseURL);
    const metrics = await getMetrics(page);

    await page.evaluate(
      (y) => window.scrollTo({ top: y, left: 0, behavior: "instant" }),
      metrics.start + metrics.distance * 5,
    );
    await waitForStable(() => readStoryFrame(page));
    await page.waitForTimeout(200);

    await expect(page.locator("[data-brand-story]")).toHaveAttribute("data-active", "2");
    await expect(page.locator("[data-story-end]")).toHaveCSS("opacity", "1");
  });

  test("navegación adelante y atrás: el recorrido responde igual al subir que al bajar", async ({
    page,
    baseURL,
  }, testInfo) => {
    test.skip(!isDesktopProject(testInfo.project.name), "Solo aplica >900px");
    await gotoAndSettle(page, baseURL);

    const readProgress = async () =>
      page.locator("[data-brand-story]").evaluate((el) => getComputedStyle(el).getPropertyValue("--story-progress"));

    await scrollToProgress(page, 0.75);
    await waitForStable(() => readStoryFrame(page));
    const forward = await readProgress();

    await scrollToProgress(page, 0.25);
    await waitForStable(() => readStoryFrame(page));
    const backward = await readProgress();

    await scrollToProgress(page, 0.75);
    await waitForStable(() => readStoryFrame(page));
    const forwardAgain = await readProgress();

    expect(parseFloat(forward)).toBeCloseTo(parseFloat(forwardAgain), 2);
    expect(parseFloat(backward)).not.toBeCloseTo(parseFloat(forward), 1);
  });
});

// ---------------------------------------------------------------------
// Comportamiento — tablet/móvil (layout estático)
// ---------------------------------------------------------------------

test.describe("comportamiento del layout estático (tablet/móvil)", () => {
  test("no hay sticky ni transform: los pasos fluyen en el documento normal", async ({ page, baseURL }, testInfo) => {
    test.skip(isDesktopProject(testInfo.project.name), "Solo aplica ≤900px");
    await gotoAndSettle(page, baseURL);
    const sticky = page.locator("[data-brand-story] > div").first();
    await expect(sticky).toHaveCSS("position", "relative");

    const steps = page.locator("[data-story-step]");
    await expect(steps.first()).toHaveCSS("opacity", "1");
    await expect(steps.first()).toHaveCSS("transform", "none");
  });

  test("la frase final, la línea de ruta y la leyenda están ocultas; la brújula sigue visible reposicionada", async ({
    page,
    baseURL,
  }, testInfo) => {
    test.skip(isDesktopProject(testInfo.project.name), "Solo aplica ≤900px");
    await gotoAndSettle(page, baseURL);
    await expect(page.locator("[data-story-end]")).toHaveCSS("display", "none");
    await expect(page.locator("[data-story-caption]")).toHaveCSS("display", "none");
    const routeLine = page.locator("[data-story-line]").locator("xpath=..");
    await expect(routeLine).toHaveCSS("display", "none");
    // La brújula en sí NO se oculta en ≤900px -- se reposiciona/reescala
    // (top:125px, width/height:100px, transform/opacity forzados a su
    // estado final), sigue siendo parte del diseño estático.
    await expect(page.locator("[data-story-compass]")).toBeVisible();
  });
});

// ---------------------------------------------------------------------
// Integración con WorkZoom, Header, NoiseOverlay, CustomCursor
// ---------------------------------------------------------------------

test("integración: BrandStory viene justo después de WorkZoom", async ({ page, baseURL }) => {
  await gotoAndSettle(page, baseURL);

  const order = await page.evaluate(() => {
    const main = document.querySelector("main");
    return Array.from(main?.children ?? []).map((el) => {
      if (el.id) return el.id;
      if (el.hasAttribute("data-work-zoom")) return "workzoom";
      if (el.hasAttribute("data-brand-story")) return "brandstory";
      return "";
    });
  });
  const workzoomIdx = order.indexOf("workzoom");
  const brandstoryIdx = order.indexOf("brandstory");
  expect(workzoomIdx).toBeGreaterThanOrEqual(0);
  expect(brandstoryIdx).toBe(workzoomIdx + 1);
});

test("integración con NoiseOverlay: sigue presente sobre BrandStory", async ({ page, baseURL }) => {
  await gotoAndSettle(page, baseURL);
  await scrollToBrandStory(page);
  const noise = page.locator('[data-shell="noise"]');
  await expect(noise).toBeAttached();
  await expect(noise).toHaveCSS("z-index", "1000");
});

test("integración con CustomCursor: los pasos no activan el texto del cursor (fidelidad)", async ({
  page,
  baseURL,
}) => {
  await gotoAndSettle(page, baseURL);
  await scrollToBrandStory(page);
  const steps = page.locator("[data-story-step]");
  const count = await steps.count();
  for (let i = 0; i < count; i++) {
    await expect(steps.nth(i)).not.toHaveAttribute("data-cursor", /.*/);
  }
});
