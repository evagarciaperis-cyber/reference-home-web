import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { test, expect, type Page } from "@playwright/test";
import { compareScreenshots } from "./utils/diff";

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
    const section = document.querySelector("[data-horizontal-section]") as HTMLElement | null;
    if (!section) return null;
    const rect = section.getBoundingClientRect();
    return {
      start: window.scrollY + rect.top,
      distance: Math.max(1, section.offsetHeight - window.innerHeight),
    };
  });
  if (!metrics) throw new Error("No se encontró [data-horizontal-section]");
  return metrics;
}

async function scrollToProgress(page: Page, progress: number) {
  const metrics = await getMetrics(page);
  const target = metrics.start + progress * metrics.distance;
  await page.evaluate((y) => window.scrollTo({ top: y, left: 0, behavior: "instant" }), target);
}

async function scrollToProjects(page: Page) {
  await page.evaluate(() => {
    const el = document.getElementById("proyectos");
    if (el) window.scrollTo({ top: el.offsetTop, left: 0, behavior: "instant" });
  });
}

// ---------------------------------------------------------------------
// Paridad visual — recorrido completo (0/25/50/75/100%) en desktop,
// estado único en tablet/móvil (grid estático).
// ---------------------------------------------------------------------

for (const point of JOURNEY_POINTS) {
  test(`projects: paridad visual en el ${Math.round(point * 100)}% del recorrido (desktop)`, async ({
    page,
    baseURL,
  }, testInfo) => {
    test.skip(!isDesktopProject(testInfo.project.name), "Recorrido horizontal solo aplica >900px");

    const oraclePath = path.join(ORACLE_DIR, `projects-${testInfo.project.name}-${Math.round(point * 100)}-home.png`);
    test.skip(
      !existsSync(oraclePath),
      `No existe oráculo para "projects-${testInfo.project.name}-${Math.round(point * 100)}". Ejecuta "npm run parity:update-oracle-projects".`,
    );
    const oracleBuf = readFileSync(oraclePath);

    await page.goto(new URL("/", baseURL).href);
    await page.waitForSelector('[data-shell="preloader"]', { state: "hidden", timeout: 3000 }).catch(() => {});
    await scrollToProgress(page, point);
    // 600ms: margen amplio sobre la transición CSS de .18s en --card-scale/
    // --image-scale. Bajo ejecución paralela (11 workers compitiendo por
    // CPU) 300ms resultó insuficiente de forma intermitente y capturaba un
    // frame a mitad de transición (flakiness distinta en cada run completo,
    // siempre estable en aislado -- contención de recursos, no un bug).
    await page.waitForTimeout(600);

    const currentBuf = await page.screenshot();
    mkdirSync(path.join(CAPTURES_DIR, "current"), { recursive: true });
    writeFileSync(
      path.join(CAPTURES_DIR, "current", `projects-${testInfo.project.name}-${Math.round(point * 100)}-home.png`),
      currentBuf,
    );

    const diffPath = path.join(CAPTURES_DIR, "diff", `projects-${testInfo.project.name}-${Math.round(point * 100)}-home.png`);
    const { diffRatio, diffPixels, totalPixels } = compareScreenshots(oracleBuf, currentBuf, diffPath);
    await testInfo.attach(`diff-projects-${testInfo.project.name}-${Math.round(point * 100)}`, {
      path: diffPath,
      contentType: "image/png",
    });
    console.log(
      `[projects ${Math.round(point * 100)}%] ${testInfo.project.name}: ${(diffRatio * 100).toFixed(3)}% (${diffPixels}/${totalPixels}px)`,
    );

    expect(diffRatio, `paridad visual de ProjectsGallery al ${Math.round(point * 100)}% — revisa el diff adjunto`).toBeLessThan(
      PARITY_THRESHOLD,
    );
  });
}

test("projects: paridad visual en tablet/móvil (grid estático)", async ({ page, baseURL }, testInfo) => {
  test.skip(isDesktopProject(testInfo.project.name), "Solo aplica ≤900px");

  const oraclePath = path.join(ORACLE_DIR, `projects-${testInfo.project.name}-home.png`);
  test.skip(
    !existsSync(oraclePath),
    `No existe oráculo para "projects-${testInfo.project.name}". Ejecuta "npm run parity:update-oracle-projects".`,
  );
  const oracleBuf = readFileSync(oraclePath);

  await page.goto(new URL("/", baseURL).href);
  await page.waitForSelector('[data-shell="preloader"]', { state: "hidden", timeout: 3000 }).catch(() => {});
  await scrollToProjects(page);
  await page.waitForTimeout(600);

  const currentBuf = await page.screenshot();
  mkdirSync(path.join(CAPTURES_DIR, "current"), { recursive: true });
  writeFileSync(path.join(CAPTURES_DIR, "current", `projects-${testInfo.project.name}-home.png`), currentBuf);

  const diffPath = path.join(CAPTURES_DIR, "diff", `projects-${testInfo.project.name}-home.png`);
  const { diffRatio, diffPixels, totalPixels } = compareScreenshots(oracleBuf, currentBuf, diffPath);
  await testInfo.attach(`diff-projects-${testInfo.project.name}`, { path: diffPath, contentType: "image/png" });
  console.log(`[projects grid] ${testInfo.project.name}: ${(diffRatio * 100).toFixed(3)}% (${diffPixels}/${totalPixels}px)`);

  expect(diffRatio, "paridad visual de ProjectsGallery (grid) — revisa el diff adjunto").toBeLessThan(PARITY_THRESHOLD);
});

// ---------------------------------------------------------------------
// Comportamiento — desktop (recorrido horizontal)
// ---------------------------------------------------------------------

test.describe("comportamiento del recorrido horizontal (desktop)", () => {
  test("estado inicial: progreso 0%, tarjeta 1 activa, sin desplazamiento", async ({ page, baseURL }, testInfo) => {
    test.skip(!isDesktopProject(testInfo.project.name), "Solo aplica >900px");
    await page.goto(new URL("/", baseURL).href);
    await scrollToProgress(page, 0);
    await page.waitForTimeout(200);

    await expect(page.locator("[data-project-current]")).toHaveText("01");
    const barWidth = await page.locator("[data-project-progress-bar]").evaluate((el) => getComputedStyle(el).width);
    expect(barWidth).toBe("0px");
    const transform = await page
      .locator("[data-horizontal-track]")
      .evaluate((el) => getComputedStyle(el).transform);
    expect(transform).toMatch(/matrix\(1, 0, 0, 1, 0, 0\)|none/);
  });

  test("inicio del sticky: la sección se fija en la parte superior del viewport", async ({ page, baseURL }, testInfo) => {
    test.skip(!isDesktopProject(testInfo.project.name), "Solo aplica >900px");
    await page.goto(new URL("/", baseURL).href);
    const sticky = page.locator("[data-horizontal-section] > div").first();
    await expect(sticky).toHaveCSS("position", "sticky");
    await expect(sticky).toHaveCSS("top", "0px");
  });

  test("llegada al final: progreso 100%, tarjeta 7 activa, barra completa", async ({ page, baseURL }, testInfo) => {
    test.skip(!isDesktopProject(testInfo.project.name), "Solo aplica >900px");
    await page.goto(new URL("/", baseURL).href);
    await scrollToProgress(page, 1);
    await page.waitForTimeout(200);

    await expect(page.locator("[data-project-current]")).toHaveText("07");
    const barWidth = await page.locator("[data-project-progress-bar]").evaluate((el) => getComputedStyle(el).width);
    const barParentWidth = await page
      .locator("[data-project-progress-bar]")
      .evaluate((el) => (el.parentElement as HTMLElement).getBoundingClientRect().width);
    expect(Math.round(parseFloat(barWidth))).toBe(Math.round(barParentWidth));
  });

  test("recorrido: el contador y el transform avanzan de forma monótona con el scroll", async ({
    page,
    baseURL,
  }, testInfo) => {
    test.skip(!isDesktopProject(testInfo.project.name), "Solo aplica >900px");
    await page.goto(new URL("/", baseURL).href);

    const readTranslateX = async () => {
      const t = await page.locator("[data-horizontal-track]").evaluate((el) => getComputedStyle(el).transform);
      const match = t.match(/matrix\(([^)]+)\)/);
      if (!match) return 0;
      const parts = match[1].split(",").map((n) => parseFloat(n.trim()));
      return parts[4] ?? 0; // tx
    };

    const values: number[] = [];
    for (const p of JOURNEY_POINTS) {
      await scrollToProgress(page, p);
      await page.waitForTimeout(200);
      values.push(await readTranslateX());
    }

    // El track se desplaza hacia la izquierda (valores negativos, cada vez
    // más negativos) a medida que avanza el progreso.
    for (let i = 1; i < values.length; i++) {
      expect(values[i], `translateX en ${JOURNEY_POINTS[i] * 100}% debe ser <= que en ${JOURNEY_POINTS[i - 1] * 100}%`).toBeLessThanOrEqual(
        values[i - 1],
      );
    }
    expect(values[0]).toBe(0);
    expect(values[values.length - 1]).toBeLessThan(0);
  });

  test("zoom: la tarjeta centrada tiene mayor --card-scale que una alejada", async ({ page, baseURL }, testInfo) => {
    test.skip(!isDesktopProject(testInfo.project.name), "Solo aplica >900px");
    await page.goto(new URL("/", baseURL).href);
    await scrollToProgress(page, 0);
    await page.waitForTimeout(200);

    const cards = page.locator("[data-project-card]");
    const firstScale = await cards.nth(0).evaluate((el) => parseFloat(getComputedStyle(el).getPropertyValue("--card-scale") || "0"));
    const lastScale = await cards.nth(6).evaluate((el) => parseFloat(getComputedStyle(el).getPropertyValue("--card-scale") || "0"));

    // En 0% la tarjeta 1 está centrada (mayor escala) y la 7 muy alejada
    // (fuera de la zona de influencia, escala mínima).
    expect(firstScale).toBeGreaterThan(lastScale);
    expect(firstScale).toBeCloseTo(1, 1); // .91 + 1*.09 = 1.0 cuando proximity=1
  });

  test("ausencia de desplazamiento horizontal inesperado de la página", async ({ page, baseURL }, testInfo) => {
    test.skip(!isDesktopProject(testInfo.project.name), "Solo aplica >900px");
    await page.goto(new URL("/", baseURL).href);
    await scrollToProgress(page, 0.5);
    await page.waitForTimeout(200);
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });

  test("resize: al cruzar el breakpoint de 900px, se recalcula el estado (sticky <-> grid)", async ({
    page,
    baseURL,
  }, testInfo) => {
    test.skip(!isDesktopProject(testInfo.project.name), "Solo aplica >900px");
    await page.goto(new URL("/", baseURL).href);
    await page.waitForTimeout(300);

    const before = await page.locator("[data-horizontal-track]").evaluate((el) => getComputedStyle(el).display);
    expect(before).toBe("flex");

    await page.setViewportSize({ width: 500, height: 900 });
    await page.waitForTimeout(300);
    const after = await page.locator("[data-horizontal-track]").evaluate((el) => getComputedStyle(el).display);
    expect(after).toBe("grid");
  });

  test("scroll rápido: un salto grande dentro del recorrido no rompe el cálculo (clamp 0-1)", async ({
    page,
    baseURL,
  }, testInfo) => {
    test.skip(!isDesktopProject(testInfo.project.name), "Solo aplica >900px");
    await page.goto(new URL("/", baseURL).href);
    const metrics = await getMetrics(page);

    // Salto muy por encima del final del recorrido.
    await page.evaluate(
      (y) => window.scrollTo({ top: y, left: 0, behavior: "instant" }),
      metrics.start + metrics.distance * 5,
    );
    await page.waitForTimeout(200);
    await expect(page.locator("[data-project-current]")).toHaveText("07");
    const barWidth = await page.locator("[data-project-progress-bar]").evaluate((el) => getComputedStyle(el).width);
    const barParentWidth = await page
      .locator("[data-project-progress-bar]")
      .evaluate((el) => (el.parentElement as HTMLElement).getBoundingClientRect().width);
    expect(Math.round(parseFloat(barWidth))).toBe(Math.round(barParentWidth)); // sigue en 100%, no se desborda
  });

  test("navegación adelante y atrás: el recorrido responde igual al subir que al bajar", async ({
    page,
    baseURL,
  }, testInfo) => {
    test.skip(!isDesktopProject(testInfo.project.name), "Solo aplica >900px");
    await page.goto(new URL("/", baseURL).href);
    // Deja asentada la secuencia de entrada (fonts.ready puede disparar un
    // remeasureHorizontal tardío que desplace las métricas bajo el mismo
    // scrollY -- mismo comportamiento que el original, no un defecto; el
    // test debe empezar en estado estable, no a mitad de carga).
    await page.waitForSelector('[data-shell="preloader"]', { state: "hidden", timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(300);

    await scrollToProgress(page, 0.75);
    await page.waitForTimeout(200);
    const forwardText = await page.locator("[data-project-current]").textContent();

    await scrollToProgress(page, 0.25);
    await page.waitForTimeout(200);
    const backwardText = await page.locator("[data-project-current]").textContent();

    await scrollToProgress(page, 0.75);
    await page.waitForTimeout(200);
    const forwardAgainText = await page.locator("[data-project-current]").textContent();

    expect(forwardText).toBe(forwardAgainText);
    expect(backwardText).not.toBe(forwardText);
  });
});

// ---------------------------------------------------------------------
// Comportamiento — tablet/móvil (grid estático, sin scroll horizontal)
// ---------------------------------------------------------------------

test.describe("comportamiento del grid estático (tablet/móvil)", () => {
  test("no hay sticky ni transform: el grid fluye en el documento normal", async ({ page, baseURL }, testInfo) => {
    test.skip(isDesktopProject(testInfo.project.name), "Solo aplica ≤900px");
    await page.goto(new URL("/", baseURL).href);
    const sticky = page.locator("[data-horizontal-section] > div").first();
    await expect(sticky).toHaveCSS("position", "relative");

    const track = page.locator("[data-horizontal-track]");
    await expect(track).toHaveCSS("transform", "none");
  });

  test("el indicador de progreso está oculto", async ({ page, baseURL }, testInfo) => {
    test.skip(isDesktopProject(testInfo.project.name), "Solo aplica ≤900px");
    await page.goto(new URL("/", baseURL).href);
    const progressWrapper = page.locator("[data-project-current]").locator("xpath=..");
    await expect(progressWrapper).toHaveCSS("display", "none");
  });
});

// ---------------------------------------------------------------------
// Integración con Solutions, Header, NoiseOverlay, CustomCursor
// ---------------------------------------------------------------------

test("integración: ProjectsGallery viene justo después de Solutions y no marca el header on-dark", async ({
  page,
  baseURL,
}) => {
  await page.goto(new URL("/", baseURL).href);
  await page.waitForSelector('[data-shell="preloader"]', { state: "hidden", timeout: 3000 }).catch(() => {});

  const order = await page.evaluate(() => {
    const main = document.querySelector("main");
    return Array.from(main?.children ?? []).map((el) => el.id);
  });
  expect(order).toEqual(["inicio", "estudio", "soluciones", "proyectos"]);

  await page.evaluate(() => {
    const el = document.getElementById("proyectos");
    if (el) window.scrollTo({ top: el.offsetTop, left: 0, behavior: "instant" });
  });
  await page.waitForTimeout(300);
  await expect(page.locator("[data-header]")).not.toHaveClass(/onDark/);
});

test("integración con NoiseOverlay: sigue presente sobre ProjectsGallery", async ({ page, baseURL }) => {
  await page.goto(new URL("/", baseURL).href);
  await scrollToProjects(page);
  const noise = page.locator('[data-shell="noise"]');
  await expect(noise).toBeAttached();
  await expect(noise).toHaveCSS("z-index", "1000");
});

test("integración con CustomCursor: las tarjetas activan el texto \"Abrir\"", async ({ page, baseURL }, testInfo) => {
  test.skip(testInfo.project.name.endsWith("-reduced"), "El hook se desactiva con prefers-reduced-motion");
  await page.goto(new URL("/", baseURL).href);
  await page.waitForSelector('[data-shell="preloader"]', { state: "hidden", timeout: 3000 }).catch(() => {});
  await scrollToProjects(page);

  const card = page.locator("[data-project-card]").first();
  const box = await card.boundingBox();
  if (!box) throw new Error("No se pudo medir la tarjeta");

  const cursor = page.locator('[data-shell="cursor"]');
  const label = page.locator('[data-shell="cursor-label"]');

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await expect(cursor).toHaveClass(/isVisible/);
  await expect(label).toHaveText("Abrir");

  await page.mouse.move(10, 10);
  await expect(cursor).not.toHaveClass(/isVisible/);
});
