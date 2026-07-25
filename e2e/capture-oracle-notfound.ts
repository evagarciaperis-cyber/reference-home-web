/**
 * Genera el oráculo de la página 404 en su único estado (estática, sin
 * motion). A diferencia del resto de rutas, NO usa el mecanismo genérico
 * de ROUTES/parity.spec.ts: el original (404.html) es un documento aislado
 * sin header/footer/preloader/cursor, pero el proyecto migrado mantiene el
 * shell global de la app en esta ruta (decisión consciente, ver
 * docs/MIGRACION.md fase 14) -- comparar la página completa no tendría
 * sentido. Este oráculo captura tal cual el HTML original (que ya es solo
 * contenido, sin shell); el lado migrado oculta su shell con
 * hideAppShell() antes de capturar (ver not-found.spec.ts), para que la
 * comparación valide el contenido realmente portado.
 *
 * Uso: npm run parity:update-oracle-notfound (manual).
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { VIEWPORTS } from "./matrix";

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
    const fileUrl = pathToFileURL(path.join(ORACLE_SITE_ROOT, "404.html")).href;

    for (const vp of VIEWPORTS) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      await page.goto(fileUrl);
      await page.waitForTimeout(300);
      const outPath = path.join(OUT_DIR, `notfound-${vp.name}.png`);
      writeFileSync(outPath, await page.screenshot());
      console.log(`oráculo (notfound): notfound-${vp.name}.png`);
      await page.close();
    }
  } finally {
    await browser.close();
  }

  console.log("\nListo. Comitea e2e/oracle/notfound-*.png.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
