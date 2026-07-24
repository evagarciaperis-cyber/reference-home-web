/**
 * Genera el oráculo de WorkZoom. Igual que ProjectsGallery (fase 7), aquí
 * NO basta un único estado "en reposo": la sección hace zoom sobre una
 * pantalla de dispositivo a medida que se avanza el scroll. Se capturan 5
 * puntos del recorrido (0/25/50/75/100%) en viewports de escritorio,
 * calculando la posición de scroll con la MISMA fórmula que usa el hook
 * (workStart + progreso * workDistance).
 *
 * En viewports ≤900px la sección cae a un layout estático sin zoom ni
 * sticky (mismo criterio que ProjectsGallery/Process) -- basta una
 * captura.
 *
 * Uso: npm run parity:update-oracle-workzoom (manual).
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Page } from "@playwright/test";
import { VIEWPORTS, ROUTES } from "./matrix";
import { hideHeader, neutralizeLoopAnimations, waitForStable } from "./utils/settle";

const ORACLE_SITE_ROOT = path.resolve(__dirname, "..", "..", "web-nueva");
const OUT_DIR = path.join(__dirname, "oracle");
const DESKTOP_MIN_WIDTH = 901;
const JOURNEY_POINTS = [0, 0.25, 0.5, 0.75, 1];

async function scrollToProgress(page: Page, progress: number) {
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
  const target = metrics.start + progress * metrics.distance;
  await page.evaluate((y) => window.scrollTo({ top: y, left: 0, behavior: "instant" }), target);
}

// Lectura usada para detectar que el frame de zoom (transform del
// dispositivo) ha terminado de renderizarse -- mismo criterio que
// readCardTransforms() en capture-oracle-projects.ts (fase 7/8).
async function readWorkZoomFrame(page: Page): Promise<string> {
  return page.evaluate(() => {
    const device = document.querySelector(".work-device") as HTMLElement | null;
    const detail = document.querySelector(".work-zoom__detail") as HTMLElement | null;
    return `${device ? getComputedStyle(device).transform : ""}|${detail ? getComputedStyle(detail).opacity : ""}`;
  });
}

async function main() {
  if (!existsSync(ORACLE_SITE_ROOT)) {
    console.error(`No se encuentra web-nueva/ en ${ORACLE_SITE_ROOT}.`);
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();

  try {
    const route = ROUTES.find((r) => r.name === "home");
    if (!route) throw new Error('No se encontró la ruta "home" en matrix.ts');
    const fileUrl = pathToFileURL(path.join(ORACLE_SITE_ROOT, route.oracleFile)).href;

    for (const vp of VIEWPORTS) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      await page.goto(fileUrl);
      await page.waitForTimeout(2800); // deja asentada la secuencia de entrada del Hero
      await neutralizeLoopAnimations(page);
      // Ver hideHeader(): la carrera real de updateHeader()/renderWorkZoom()
      // al cruzar el umbral de inmersión hace que el estado is-hidden del
      // header dependa de en qué salto exacto de scroll coincide ese cruce
      // -- no determinista entre capturas. Se oculta aquí para que el
      // oráculo capture la mecánica del zoom, no ese micro-estado.
      await hideHeader(page);

      if (vp.width >= DESKTOP_MIN_WIDTH) {
        for (const p of JOURNEY_POINTS) {
          await scrollToProgress(page, p);
          await waitForStable(() => readWorkZoomFrame(page));
          await page.waitForTimeout(300);
          const outPath = path.join(OUT_DIR, `workzoom-${vp.name}-${Math.round(p * 100)}-home.png`);
          writeFileSync(outPath, await page.screenshot());
          console.log(`oráculo (workzoom): workzoom-${vp.name}-${Math.round(p * 100)}-home.png`);
        }
      } else {
        await page.evaluate(() => {
          const el = document.querySelector("[data-work-zoom]") as HTMLElement | null;
          if (el) window.scrollTo({ top: el.offsetTop, left: 0, behavior: "instant" });
        });
        await page.waitForTimeout(500);
        const outPath = path.join(OUT_DIR, `workzoom-${vp.name}-home.png`);
        writeFileSync(outPath, await page.screenshot());
        console.log(`oráculo (workzoom): workzoom-${vp.name}-home.png`);
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }

  console.log("\nListo. Comitea e2e/oracle/workzoom-*.png.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
