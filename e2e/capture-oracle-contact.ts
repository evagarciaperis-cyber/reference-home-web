/**
 * Genera el oráculo de Contact en su único estado (sección estática, sin
 * scroll-driven motion, sin data-split-reveal/data-reveal -- solo hover en
 * el botón magnético, que no se captura en reposo). Mismo patrón que el
 * resto de secciones estáticas: scroll instantáneo hasta la sección tras
 * neutralizar las animaciones en bucle del Hero.
 *
 * Uso: npm run parity:update-oracle-contact (manual).
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
        const el = document.getElementById("contacto");
        if (el) window.scrollTo({ top: el.offsetTop, left: 0, behavior: "instant" });
      });
      await page.waitForTimeout(300);
      const outPath = path.join(OUT_DIR, `contact-${vp.name}-home.png`);
      writeFileSync(outPath, await page.screenshot());
      console.log(`oráculo (contact): contact-${vp.name}-home.png`);
      await page.close();
    }
  } finally {
    await browser.close();
  }

  console.log("\nListo. Comitea e2e/oracle/contact-*.png.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
