/**
 * Genera el oráculo de Footer en su único estado (sección estática, sin
 * motion). Scroll instantáneo hasta el final de la página -- footer es el
 * último contenido tanto en el oráculo como en el proyecto migrado a
 * partir de esta fase, así que no aplica aquí el problema de recorte
 * (clamping) por altura de página distinta que sí afectó a Principles/
 * Stats (fases 11/12): ambos lados terminan en el mismo punto real.
 *
 * Uso: npm run parity:update-oracle-footer (manual).
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
      await page.waitForTimeout(2800); // deja asentada la secuencia de entrada del Hero
      await neutralizeLoopAnimations(page);
      await page.evaluate(() => {
        window.scrollTo({ top: document.body.scrollHeight, left: 0, behavior: "instant" });
      });
      await page.waitForTimeout(300);
      const outPath = path.join(OUT_DIR, `footer-${vp.name}-home.png`);
      writeFileSync(outPath, await page.screenshot());
      console.log(`oráculo (footer): footer-${vp.name}-home.png`);
      await page.close();
    }
  } finally {
    await browser.close();
  }

  console.log("\nListo. Comitea e2e/oracle/footer-*.png.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
