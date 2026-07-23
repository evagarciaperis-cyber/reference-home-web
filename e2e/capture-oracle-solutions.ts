/**
 * Genera el oráculo de Solutions en su estado inicial (servicio 1 activo,
 * igual que el HTML original), con scroll instantáneo hasta #soluciones.
 * Las interacciones del acordeón (abrir otro servicio, cerrar) se validan
 * por comportamiento en e2e/solutions.spec.ts, no por píxel -- igual que
 * el resto de estados dinámicos ya migrados.
 *
 * Uso: npm run parity:update-oracle-solutions (manual).
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { VIEWPORTS, ROUTES } from "./matrix";
import { neutralizeLoopAnimations } from "./utils/settle";

const ORACLE_SITE_ROOT = path.resolve(__dirname, "..", "..", "web-nueva");
const OUT_DIR = path.join(__dirname, "oracle");

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
      // Espera fija (no waitForSelector): deja que la secuencia de entrada
      // del Hero se asiente del todo antes de neutralizar y saltar de
      // scroll -- neutralizar demasiado pronto (justo cuando aparece
      // .hero.is-ready, ~800ms) dejaba un remanente de composición GPU del
      // orb desplazado unos px, en vez de eliminarlo del todo.
      await page.waitForTimeout(2800);
      await neutralizeLoopAnimations(page);
      await page.evaluate(() => {
        const el = document.getElementById("soluciones");
        if (el) window.scrollTo({ top: el.offsetTop, left: 0, behavior: "instant" });
      });
      await page.waitForTimeout(500);
      const outPath = path.join(OUT_DIR, `solutions-${vp.name}-home.png`);
      writeFileSync(outPath, await page.screenshot());
      console.log(`oráculo (solutions): solutions-${vp.name}-home.png`);
      await page.close();
    }
  } finally {
    await browser.close();
  }

  console.log("\nListo. Comitea e2e/oracle/solutions-*.png.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
