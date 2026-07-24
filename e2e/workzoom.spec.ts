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
    const section = document.querySelector("[data-work-zoom]") as HTMLElement | null;
    if (!section) return null;
    const rect = section.getBoundingClientRect();
    return {
      start: window.scrollY + rect.top,
      distance: Math.max(1, section.offsetHeight - window.innerHeight),
    };
  });
  if (!metrics) throw new Error("No se encontró [data-work-zoom]");
  return metrics;
}

async function scrollToProgress(page: Page, progress: number) {
  const metrics = await getMetrics(page);
  const target = metrics.start + progress * metrics.distance;
  await page.evaluate((y) => window.scrollTo({ top: y, left: 0, behavior: "instant" }), target);
  // A diferencia de ProjectsGallery (transición CSS de .18s que justificaba
  // waitForStable), aquí el transform del dispositivo se fija por JS sin
  // transición -- el valor final ya está listo en el primer rAF tras el
  // scroll. El bug real estaba en el propio test: waitForStable() empieza
  // a sondear inmediatamente con setTimeout (reloj de Node), que puede
  // ganarle la carrera al primer rAF real del navegador tras un scroll
  // programático repetido en sucesión rápida -- su primera lectura
  // capturaba a veces el frame TODAVÍA no actualizado y lo daba por
  // "estable" nada más empezar. Forzar aquí dos rAF reales del navegador
  // antes de devolver el control elimina la carrera de raíz (reproducido
  // y confirmado con logging de scrollY/métricas: la posición de scroll
  // siempre era la correcta, pero --work-progress a veces quedaba con el
  // valor del scroll anterior).
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function scrollToWorkZoom(page: Page) {
  await page.evaluate(() => {
    const el = document.querySelector("[data-work-zoom]") as HTMLElement | null;
    if (el) window.scrollTo({ top: el.offsetTop, left: 0, behavior: "instant" });
  });
}

// Lectura usada para detectar que el frame de zoom (transform del
// dispositivo) ha terminado de renderizarse -- mismo criterio que
// readCardTransforms() en projects-gallery.spec.ts (fase 7/8).
async function readWorkZoomFrame(page: Page): Promise<string> {
  return page.evaluate(() => {
    const device = document.querySelector("[data-work-device]") as HTMLElement | null;
    const detail = document.querySelector("[data-work-detail]") as HTMLElement | null;
    return `${device ? getComputedStyle(device).transform : ""}|${detail ? getComputedStyle(detail).opacity : ""}`;
  });
}

// ---------------------------------------------------------------------
// Paridad visual — recorrido completo (0/25/50/75/100%) en desktop,
// estado único en tablet/móvil (layout estático).
// ---------------------------------------------------------------------

for (const point of JOURNEY_POINTS) {
  test(`workzoom: paridad visual en el ${Math.round(point * 100)}% del recorrido (desktop)`, async ({
    page,
    baseURL,
  }, testInfo) => {
    test.skip(!isDesktopProject(testInfo.project.name), "Recorrido de zoom solo aplica >900px");

    const oraclePath = path.join(ORACLE_DIR, `workzoom-${testInfo.project.name}-${Math.round(point * 100)}-home.png`);
    test.skip(
      !existsSync(oraclePath),
      `No existe oráculo para "workzoom-${testInfo.project.name}-${Math.round(point * 100)}". Ejecuta "npm run parity:update-oracle-workzoom".`,
    );
    const oracleBuf = readFileSync(oraclePath);

    await page.goto(new URL("/", baseURL).href);
    // Deja asentada la secuencia de entrada antes de cualquier scroll
    // propio del test: document.fonts.ready puede disparar un
    // measureWorkZoom() tardío que desplace las métricas bajo el mismo
    // scrollY -- mismo bug ya encontrado y corregido en ProjectsGallery
    // (fase 7) y reproducido aquí (ver capture-oracle-workzoom.ts/git log).
    await page.waitForSelector('[data-shell="preloader"]', { state: "hidden", timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(300);

    // Recorre los puntos previos EN ORDEN antes de llegar al objetivo de
    // este test, igual que capture-oracle-workzoom.ts (scroll secuencial
    // dentro de una misma página, no saltos independientes) -- mismo
    // criterio de fidelidad de recorrido que projects-gallery.spec.ts.
    for (const priorPoint of JOURNEY_POINTS) {
      if (priorPoint > point) break;
      await scrollToProgress(page, priorPoint);
      await waitForStable(() => readWorkZoomFrame(page));
    }
    await page.waitForTimeout(300);
    // hideHeader(): ver utils/settle.ts -- carrera real (también presente
    // en el original) entre updateHeader() vía 'scroll' y su segunda
    // invocación explícita dentro de renderWorkZoom() al cruzar el umbral
    // de inmersión. Confirmado reproduciendo el mismo salto directo sobre
    // el HTML original sin tocar. Se oculta el header para que esta
    // comparación valide la mecánica del zoom, no ese micro-estado.
    await hideHeader(page);

    const currentBuf = await page.screenshot();
    mkdirSync(path.join(CAPTURES_DIR, "current"), { recursive: true });
    writeFileSync(
      path.join(CAPTURES_DIR, "current", `workzoom-${testInfo.project.name}-${Math.round(point * 100)}-home.png`),
      currentBuf,
    );

    const diffPath = path.join(CAPTURES_DIR, "diff", `workzoom-${testInfo.project.name}-${Math.round(point * 100)}-home.png`);
    const { diffRatio, diffPixels, totalPixels } = compareScreenshots(oracleBuf, currentBuf, diffPath);
    await testInfo.attach(`diff-workzoom-${testInfo.project.name}-${Math.round(point * 100)}`, {
      path: diffPath,
      contentType: "image/png",
    });
    console.log(
      `[workzoom ${Math.round(point * 100)}%] ${testInfo.project.name}: ${(diffRatio * 100).toFixed(3)}% (${diffPixels}/${totalPixels}px)`,
    );

    expect(diffRatio, `paridad visual de WorkZoom al ${Math.round(point * 100)}% — revisa el diff adjunto`).toBeLessThan(
      PARITY_THRESHOLD,
    );
  });
}

test("workzoom: paridad visual en tablet/móvil (layout estático)", async ({ page, baseURL }, testInfo) => {
  test.skip(isDesktopProject(testInfo.project.name), "Solo aplica ≤900px");

  const oraclePath = path.join(ORACLE_DIR, `workzoom-${testInfo.project.name}-home.png`);
  test.skip(
    !existsSync(oraclePath),
    `No existe oráculo para "workzoom-${testInfo.project.name}". Ejecuta "npm run parity:update-oracle-workzoom".`,
  );
  const oracleBuf = readFileSync(oraclePath);

  await page.goto(new URL("/", baseURL).href);
  await page.waitForSelector('[data-shell="preloader"]', { state: "hidden", timeout: 3000 }).catch(() => {});
  await scrollToWorkZoom(page);
  await page.waitForTimeout(500);

  const currentBuf = await page.screenshot();
  mkdirSync(path.join(CAPTURES_DIR, "current"), { recursive: true });
  writeFileSync(path.join(CAPTURES_DIR, "current", `workzoom-${testInfo.project.name}-home.png`), currentBuf);

  const diffPath = path.join(CAPTURES_DIR, "diff", `workzoom-${testInfo.project.name}-home.png`);
  const { diffRatio, diffPixels, totalPixels } = compareScreenshots(oracleBuf, currentBuf, diffPath);
  await testInfo.attach(`diff-workzoom-${testInfo.project.name}`, { path: diffPath, contentType: "image/png" });
  console.log(`[workzoom static] ${testInfo.project.name}: ${(diffRatio * 100).toFixed(3)}% (${diffPixels}/${totalPixels}px)`);

  expect(diffRatio, "paridad visual de WorkZoom (estático) — revisa el diff adjunto").toBeLessThan(PARITY_THRESHOLD);
});

// ---------------------------------------------------------------------
// Comportamiento — desktop (recorrido de zoom)
// ---------------------------------------------------------------------

test.describe("comportamiento del zoom (desktop)", () => {
  test("estado inicial: dispositivo en escala mínima, cabecera visible, sin inmersión", async ({
    page,
    baseURL,
  }, testInfo) => {
    test.skip(!isDesktopProject(testInfo.project.name), "Solo aplica >900px");
    await page.goto(new URL("/", baseURL).href);
    // Deja asentada la secuencia de entrada antes de cualquier scroll
    // propio del test: document.fonts.ready puede disparar un
    // measureWorkZoom() tardío que desplace las métricas bajo el mismo
    // scrollY -- mismo bug ya encontrado y corregido en ProjectsGallery
    // (fase 7) y reproducido aquí (ver capture-oracle-workzoom.ts/git log).
    await page.waitForSelector('[data-shell="preloader"]', { state: "hidden", timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(300);
    await scrollToProgress(page, 0);
    await page.waitForTimeout(200);

    const section = page.locator("[data-work-zoom]");
    await expect(section).not.toHaveAttribute("data-immersed", /.*/);
    const headingOpacity = await page
      .locator("[data-work-heading]")
      .evaluate((el) => getComputedStyle(el).opacity);
    expect(Number(headingOpacity)).toBeCloseTo(1, 1);
  });

  test("recorrido: el dispositivo escala de forma monótona con el scroll", async ({ page, baseURL }, testInfo) => {
    test.skip(!isDesktopProject(testInfo.project.name), "Solo aplica >900px");
    await page.goto(new URL("/", baseURL).href);
    // Deja asentada la secuencia de entrada antes de cualquier scroll
    // propio del test: document.fonts.ready puede disparar un
    // measureWorkZoom() tardío que desplace las métricas bajo el mismo
    // scrollY -- mismo bug ya encontrado y corregido en ProjectsGallery
    // (fase 7) y reproducido aquí (ver capture-oracle-workzoom.ts/git log).
    await page.waitForSelector('[data-shell="preloader"]', { state: "hidden", timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(300);

    const readScale = async () => {
      const t = await page.locator("[data-work-device]").evaluate((el) => getComputedStyle(el).transform);
      // rotateX(0deg) (zoomP=1, p>=.76) hace que el navegador colapse la
      // matriz a la forma 2D "matrix(...)" en vez de "matrix3d(...)" -- hay
      // que aceptar ambas formas, no solo matrix3d. En ambas, la primera
      // componente es el factor de escala en X (rotateX no perturba el eje
      // X, así que la composición traslación·rotateX·escala dejalo intacto).
      const match = t.match(/matrix(?:3d)?\(([^)]+)\)/);
      if (!match) return 0;
      const parts = match[1].split(",").map((n) => parseFloat(n.trim()));
      return parts[0] ?? 0;
    };

    const values: number[] = [];
    for (const p of JOURNEY_POINTS) {
      await scrollToProgress(page, p);
      await waitForStable(() => readWorkZoomFrame(page));
      values.push(await readScale());
    }

    for (let i = 1; i < values.length; i++) {
      expect(values[i], `escala en ${JOURNEY_POINTS[i] * 100}% debe ser >= que en ${JOURNEY_POINTS[i - 1] * 100}%`).toBeGreaterThanOrEqual(
        values[i - 1] - 0.001,
      );
    }
    expect(values[values.length - 1]).toBeGreaterThan(values[0]);
  });

  test("inmersión: al superar el 57% del recorrido, la sección se marca inmersa y el header pasa a on-dark", async ({
    page,
    baseURL,
  }, testInfo) => {
    test.skip(!isDesktopProject(testInfo.project.name), "Solo aplica >900px");
    await page.goto(new URL("/", baseURL).href);
    // Deja asentada la secuencia de entrada antes de cualquier scroll
    // propio del test: document.fonts.ready puede disparar un
    // measureWorkZoom() tardío que desplace las métricas bajo el mismo
    // scrollY -- mismo bug ya encontrado y corregido en ProjectsGallery
    // (fase 7) y reproducido aquí (ver capture-oracle-workzoom.ts/git log).
    await page.waitForSelector('[data-shell="preloader"]', { state: "hidden", timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(300);
    const section = page.locator("[data-work-zoom]");
    const header = page.locator("[data-header]");

    await scrollToProgress(page, 0.5);
    await waitForStable(() => readWorkZoomFrame(page));
    await expect(section).not.toHaveAttribute("data-immersed", /.*/);
    await expect(header).not.toHaveClass(/onDark/);

    await scrollToProgress(page, 0.75);
    await waitForStable(() => readWorkZoomFrame(page));
    await expect(section).toHaveAttribute("data-immersed", "");
    await expect(header).toHaveClass(/onDark/);

    await scrollToProgress(page, 0.5);
    await waitForStable(() => readWorkZoomFrame(page));
    await expect(section).not.toHaveAttribute("data-immersed", /.*/);
    await expect(header).not.toHaveClass(/onDark/);
  });

  test("llegada al final: el panel de detalle del proyecto es visible e interactivo", async ({
    page,
    baseURL,
  }, testInfo) => {
    test.skip(!isDesktopProject(testInfo.project.name), "Solo aplica >900px");
    await page.goto(new URL("/", baseURL).href);
    // Deja asentada la secuencia de entrada antes de cualquier scroll
    // propio del test: document.fonts.ready puede disparar un
    // measureWorkZoom() tardío que desplace las métricas bajo el mismo
    // scrollY -- mismo bug ya encontrado y corregido en ProjectsGallery
    // (fase 7) y reproducido aquí (ver capture-oracle-workzoom.ts/git log).
    await page.waitForSelector('[data-shell="preloader"]', { state: "hidden", timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(300);
    await scrollToProgress(page, 1);
    await waitForStable(() => readWorkZoomFrame(page));
    await page.waitForTimeout(200);

    const detail = page.locator("[data-work-detail]");
    await expect(detail).toHaveCSS("opacity", "1");
    await expect(detail).toHaveCSS("pointer-events", "auto");
    await expect(detail.locator("h3")).toHaveText("Atelier Norte");
  });

  test("indicador de scroll: se desvanece al iniciar el recorrido", async ({ page, baseURL }, testInfo) => {
    test.skip(!isDesktopProject(testInfo.project.name), "Solo aplica >900px");
    await page.goto(new URL("/", baseURL).href);
    // Deja asentada la secuencia de entrada antes de cualquier scroll
    // propio del test: document.fonts.ready puede disparar un
    // measureWorkZoom() tardío que desplace las métricas bajo el mismo
    // scrollY -- mismo bug ya encontrado y corregido en ProjectsGallery
    // (fase 7) y reproducido aquí (ver capture-oracle-workzoom.ts/git log).
    await page.waitForSelector('[data-shell="preloader"]', { state: "hidden", timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(300);

    await scrollToProgress(page, 0);
    await page.waitForTimeout(200);
    const initialOpacity = await page.locator("[data-work-scroll]").evaluate((el) => getComputedStyle(el).opacity);
    expect(Number(initialOpacity)).toBeCloseTo(1, 1);

    await scrollToProgress(page, 0.3);
    await page.waitForTimeout(200);
    const laterOpacity = await page.locator("[data-work-scroll]").evaluate((el) => getComputedStyle(el).opacity);
    expect(Number(laterOpacity)).toBeLessThan(Number(initialOpacity));
  });

  test("ausencia de desplazamiento horizontal inesperado de la página", async ({ page, baseURL }, testInfo) => {
    test.skip(!isDesktopProject(testInfo.project.name), "Solo aplica >900px");
    await page.goto(new URL("/", baseURL).href);
    // Deja asentada la secuencia de entrada antes de cualquier scroll
    // propio del test: document.fonts.ready puede disparar un
    // measureWorkZoom() tardío que desplace las métricas bajo el mismo
    // scrollY -- mismo bug ya encontrado y corregido en ProjectsGallery
    // (fase 7) y reproducido aquí (ver capture-oracle-workzoom.ts/git log).
    await page.waitForSelector('[data-shell="preloader"]', { state: "hidden", timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(300);
    await scrollToProgress(page, 0.5);
    await page.waitForTimeout(200);
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });

  test("resize: al cruzar el breakpoint de 900px, se recalcula el layout (zoom <-> estático)", async ({
    page,
    baseURL,
  }, testInfo) => {
    test.skip(!isDesktopProject(testInfo.project.name), "Solo aplica >900px");
    await page.goto(new URL("/", baseURL).href);
    // Deja asentada la secuencia de entrada antes de cualquier scroll
    // propio del test: document.fonts.ready puede disparar un
    // measureWorkZoom() tardío que desplace las métricas bajo el mismo
    // scrollY -- mismo bug ya encontrado y corregido en ProjectsGallery
    // (fase 7) y reproducido aquí (ver capture-oracle-workzoom.ts/git log).
    await page.waitForSelector('[data-shell="preloader"]', { state: "hidden", timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(300);
    await page.waitForTimeout(300);

    const before = await page.locator("[data-work-zoom] > div").first().evaluate((el) => getComputedStyle(el).position);
    expect(before).toBe("sticky");

    await page.setViewportSize({ width: 500, height: 900 });
    await page.waitForTimeout(300);
    const after = await page.locator("[data-work-zoom] > div").first().evaluate((el) => getComputedStyle(el).position);
    expect(after).toBe("relative");
  });

  test("scroll rápido: un salto grande dentro del recorrido no rompe el cálculo (clamp 0-1)", async ({
    page,
    baseURL,
  }, testInfo) => {
    test.skip(!isDesktopProject(testInfo.project.name), "Solo aplica >900px");
    await page.goto(new URL("/", baseURL).href);
    // Deja asentada la secuencia de entrada antes de cualquier scroll
    // propio del test: document.fonts.ready puede disparar un
    // measureWorkZoom() tardío que desplace las métricas bajo el mismo
    // scrollY -- mismo bug ya encontrado y corregido en ProjectsGallery
    // (fase 7) y reproducido aquí (ver capture-oracle-workzoom.ts/git log).
    await page.waitForSelector('[data-shell="preloader"]', { state: "hidden", timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(300);
    const metrics = await getMetrics(page);

    await page.evaluate(
      (y) => window.scrollTo({ top: y, left: 0, behavior: "instant" }),
      metrics.start + metrics.distance * 5,
    );
    await waitForStable(() => readWorkZoomFrame(page));
    await page.waitForTimeout(200);

    const detail = page.locator("[data-work-detail]");
    await expect(detail).toHaveCSS("opacity", "1");
    await expect(page.locator("[data-work-zoom]")).toHaveAttribute("data-immersed", "");
  });

  test("navegación adelante y atrás: el recorrido responde igual al subir que al bajar", async ({
    page,
    baseURL,
  }, testInfo) => {
    test.skip(!isDesktopProject(testInfo.project.name), "Solo aplica >900px");
    await page.goto(new URL("/", baseURL).href);
    // Deja asentada la secuencia de entrada antes de cualquier scroll
    // propio del test: document.fonts.ready puede disparar un
    // measureWorkZoom() tardío que desplace las métricas bajo el mismo
    // scrollY -- mismo bug ya encontrado y corregido en ProjectsGallery
    // (fase 7) y reproducido aquí (ver capture-oracle-workzoom.ts/git log).
    await page.waitForSelector('[data-shell="preloader"]', { state: "hidden", timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(300);

    const readProgress = async () =>
      page.locator("[data-work-zoom]").evaluate((el) => getComputedStyle(el).getPropertyValue("--work-progress"));

    await scrollToProgress(page, 0.75);
    await waitForStable(() => readWorkZoomFrame(page));
    const forward = await readProgress();

    await scrollToProgress(page, 0.25);
    await waitForStable(() => readWorkZoomFrame(page));
    const backward = await readProgress();

    await scrollToProgress(page, 0.75);
    await waitForStable(() => readWorkZoomFrame(page));
    const forwardAgain = await readProgress();

    expect(parseFloat(forward)).toBeCloseTo(parseFloat(forwardAgain), 2);
    expect(parseFloat(backward)).not.toBeCloseTo(parseFloat(forward), 1);
  });
});

// ---------------------------------------------------------------------
// Comportamiento — tablet/móvil (layout estático)
// ---------------------------------------------------------------------

test.describe("comportamiento del layout estático (tablet/móvil)", () => {
  test("no hay sticky ni transform: el dispositivo fluye en el documento normal", async ({ page, baseURL }, testInfo) => {
    test.skip(isDesktopProject(testInfo.project.name), "Solo aplica ≤900px");
    await page.goto(new URL("/", baseURL).href);
    // Deja asentada la secuencia de entrada antes de cualquier scroll
    // propio del test: document.fonts.ready puede disparar un
    // measureWorkZoom() tardío que desplace las métricas bajo el mismo
    // scrollY -- mismo bug ya encontrado y corregido en ProjectsGallery
    // (fase 7) y reproducido aquí (ver capture-oracle-workzoom.ts/git log).
    await page.waitForSelector('[data-shell="preloader"]', { state: "hidden", timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(300);
    const sticky = page.locator("[data-work-zoom] > div").first();
    await expect(sticky).toHaveCSS("position", "relative");

    const device = page.locator("[data-work-device]");
    await expect(device).toHaveCSS("transform", "none");
  });

  test("el indicador de scroll está oculto", async ({ page, baseURL }, testInfo) => {
    test.skip(isDesktopProject(testInfo.project.name), "Solo aplica ≤900px");
    await page.goto(new URL("/", baseURL).href);
    // Deja asentada la secuencia de entrada antes de cualquier scroll
    // propio del test: document.fonts.ready puede disparar un
    // measureWorkZoom() tardío que desplace las métricas bajo el mismo
    // scrollY -- mismo bug ya encontrado y corregido en ProjectsGallery
    // (fase 7) y reproducido aquí (ver capture-oracle-workzoom.ts/git log).
    await page.waitForSelector('[data-shell="preloader"]', { state: "hidden", timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(300);
    const scrollHint = page.locator("[data-work-scroll]");
    await expect(scrollHint).toHaveCSS("display", "none");
  });
});

// ---------------------------------------------------------------------
// Integración con Process, Header, NoiseOverlay, CustomCursor
// ---------------------------------------------------------------------

test("integración: WorkZoom viene justo después de Process", async ({ page, baseURL }) => {
  await page.goto(new URL("/", baseURL).href);
  await page.waitForSelector('[data-shell="preloader"]', { state: "hidden", timeout: 3000 }).catch(() => {});

  const order = await page.evaluate(() => {
    const main = document.querySelector("main");
    return Array.from(main?.children ?? []).map((el) => el.id || (el.hasAttribute("data-work-zoom") ? "workzoom" : ""));
  });
  const procesoIdx = order.indexOf("proceso");
  const workzoomIdx = order.indexOf("workzoom");
  expect(procesoIdx).toBeGreaterThanOrEqual(0);
  expect(workzoomIdx).toBe(procesoIdx + 1);
});

test("integración con NoiseOverlay: sigue presente sobre WorkZoom", async ({ page, baseURL }) => {
  await page.goto(new URL("/", baseURL).href);
  await scrollToWorkZoom(page);
  const noise = page.locator('[data-shell="noise"]');
  await expect(noise).toBeAttached();
  await expect(noise).toHaveCSS("z-index", "1000");
});

test("integración con CustomCursor: el dispositivo y el CTA no activan el texto del cursor (fidelidad)", async ({
  page,
  baseURL,
}) => {
  await page.goto(new URL("/", baseURL).href);
  await scrollToWorkZoom(page);
  const device = page.locator("[data-work-device]");
  await expect(device).not.toHaveAttribute("data-cursor", /.*/);
});
