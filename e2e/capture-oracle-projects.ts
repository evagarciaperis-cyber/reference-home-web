/**
 * Genera el oráculo de ProjectsGallery. A diferencia de las secciones
 * anteriores, aquí NO basta un único estado "en reposo":
 *
 * - En viewports >900px (desktop): la sección es un scroll horizontal
 *   sticky. Se capturan 5 puntos del recorrido (0/25/50/75/100%),
 *   calculando la posición de scroll con la MISMA fórmula que usa el hook
 *   (horizontalStart + progreso * horizontalDistance), para poder validar
 *   el recorrido completo, no solo el instante inicial (regla nº11 de la
 *   Fase 7).
 * - En viewports ≤900px: la sección cae a un grid estático de 1-2
 *   columnas sin scroll horizontal ni sticky (mismo criterio que
 *   Manifesto/Solutions) -- basta una captura.
 *
 * Uso: npm run parity:update-oracle-projects (manual).
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Page } from "@playwright/test";
import { VIEWPORTS, ROUTES } from "./matrix";
import { neutralizeLoopAnimations } from "./utils/settle";

const ORACLE_SITE_ROOT = path.resolve(__dirname, "..", "..", "web-nueva");
const OUT_DIR = path.join(__dirname, "oracle");
const DESKTOP_MIN_WIDTH = 901;
const JOURNEY_POINTS = [0, 0.25, 0.5, 0.75, 1];

async function scrollToProgress(page: Page, progress: number) {
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
  const target = metrics.start + progress * metrics.distance;
  await page.evaluate((y) => window.scrollTo({ top: y, left: 0, behavior: "instant" }), target);
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

      if (vp.width >= DESKTOP_MIN_WIDTH) {
        for (const p of JOURNEY_POINTS) {
          await scrollToProgress(page, p);
          await page.waitForTimeout(600);
          const outPath = path.join(OUT_DIR, `projects-${vp.name}-${Math.round(p * 100)}-home.png`);
          writeFileSync(outPath, await page.screenshot());
          console.log(`oráculo (projects): projects-${vp.name}-${Math.round(p * 100)}-home.png`);
        }
      } else {
        await page.evaluate(() => {
          const el = document.getElementById("proyectos");
          if (el) window.scrollTo({ top: el.offsetTop, left: 0, behavior: "instant" });
        });
        await page.waitForTimeout(600);
        const outPath = path.join(OUT_DIR, `projects-${vp.name}-home.png`);
        writeFileSync(outPath, await page.screenshot());
        console.log(`oráculo (projects): projects-${vp.name}-home.png`);
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }

  console.log("\nListo. Comitea e2e/oracle/projects-*.png.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
