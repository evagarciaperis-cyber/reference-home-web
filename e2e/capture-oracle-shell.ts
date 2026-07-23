/**
 * Genera el oráculo del "instante preloader": una captura de web-nueva/
 * tomada justo tras la carga, ANTES de que main.js oculte el preloader
 * (780ms tras `load`). Al ser una pantalla completa y opaca (z-index 2000),
 * cubre cualquier contenido de la home que exista o no detrás — por eso
 * sirve para validar el Preloader de forma aislada, incluso antes de migrar
 * el resto de la home (ver e2e/shell.spec.ts).
 *
 * Solo se genera para los viewports SIN reduced-motion: con
 * prefers-reduced-motion el propio main.js usa un delay de 0ms, así que el
 * preloader se oculta casi instantáneamente (confirmado empíricamente,
 * <40ms) y no hay una foto intermedia estable que comparar. Ese caso se
 * valida por comportamiento, no por píxel (ver e2e/shell.spec.ts).
 *
 * Uso: npm run parity:update-oracle-shell (manual, igual que capture-oracle.ts).
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { VIEWPORTS, ROUTES } from "./matrix";
import { freezeAnimation } from "./utils/settle";

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
      const page = await browser.newPage({
        viewport: { width: vp.width, height: vp.height },
        reducedMotion: vp.reducedMotion ? "reduce" : "no-preference",
      });
      await page.goto(fileUrl);
      await page.waitForSelector(".preloader");
      await freezeAnimation(page, ".preloader__line span");
      const outPath = path.join(OUT_DIR, `preloader-${vp.name}-${route.name}.png`);
      writeFileSync(outPath, await page.screenshot());
      await page.close();
      console.log(`oráculo (preloader): preloader-${vp.name}-${route.name}.png`);
    }
  } finally {
    await browser.close();
  }

  console.log("\nListo. Comitea e2e/oracle/preloader-*.png.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
