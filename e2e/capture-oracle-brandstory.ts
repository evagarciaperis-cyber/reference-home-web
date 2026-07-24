/**
 * Genera el oráculo de BrandStory. Mismo patrón que WorkZoom (fase 9):
 * 5 capturas por viewport de escritorio en los puntos exactos del
 * recorrido (0/25/50/75/100%), que además coinciden aproximadamente con
 * el centro de cada uno de los 3 segmentos de paso (storySegments en
 * main.js: .07-.38, .31-.65, .58-.87) y con el inicio/fin de las frases.
 *
 * En viewports ≤900px la sección cae a un layout estático sin sticky ni
 * brújula animada (mismo criterio que WorkZoom/ProjectsGallery) -- basta
 * una captura.
 *
 * Uso: npm run parity:update-oracle-brandstory (manual).
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
    const section = document.querySelector("[data-brand-story]") as HTMLElement | null;
    if (!section) return null;
    const rect = section.getBoundingClientRect();
    return {
      start: window.scrollY + rect.top,
      distance: Math.max(1, section.offsetHeight - window.innerHeight),
    };
  });
  if (!metrics) throw new Error("No se encontró [data-brand-story]");
  const target = metrics.start + progress * metrics.distance;
  await page.evaluate((y) => window.scrollTo({ top: y, left: 0, behavior: "instant" }), target);
}

// Lectura usada para detectar que el frame (transform de la brújula +
// opacidad del paso activo) ha terminado de renderizarse.
async function readStoryFrame(page: Page): Promise<string> {
  return page.evaluate(() => {
    const compass = document.querySelector(".brand-story__compass") as HTMLElement | null;
    const activeStep = document.querySelector(".brand-step.is-active") as HTMLElement | null;
    return `${compass ? getComputedStyle(compass).transform : ""}|${activeStep ? getComputedStyle(activeStep).opacity : ""}`;
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
      // Ver hideHeader() en utils/settle.ts: misma carrera updateHeader()/
      // render*() presente en el original que ya se documentó en WorkZoom
      // (fase 9); BrandStory no llama a updateHeader() explícitamente, pero
      // se mantiene el mismo criterio de aislar la comparación de la
      // mecánica propia de la sección.
      await hideHeader(page);

      if (vp.width >= DESKTOP_MIN_WIDTH) {
        for (const p of JOURNEY_POINTS) {
          await scrollToProgress(page, p);
          await waitForStable(() => readStoryFrame(page));
          await page.waitForTimeout(600);
          const outPath = path.join(OUT_DIR, `brandstory-${vp.name}-${Math.round(p * 100)}-home.png`);
          writeFileSync(outPath, await page.screenshot());
          console.log(`oráculo (brandstory): brandstory-${vp.name}-${Math.round(p * 100)}-home.png`);
        }
      } else {
        await page.evaluate(() => {
          const el = document.querySelector("[data-brand-story]") as HTMLElement | null;
          if (el) window.scrollTo({ top: el.offsetTop, left: 0, behavior: "instant" });
        });
        await page.waitForTimeout(500);
        const outPath = path.join(OUT_DIR, `brandstory-${vp.name}-home.png`);
        writeFileSync(outPath, await page.screenshot());
        console.log(`oráculo (brandstory): brandstory-${vp.name}-home.png`);
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }

  console.log("\nListo. Comitea e2e/oracle/brandstory-*.png.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
