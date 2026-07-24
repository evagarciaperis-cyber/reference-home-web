/**
 * Genera el oráculo de Process en su único estado (sección estática, sin
 * sticky ni parallax ni scroll-driven motion -- ver Process.tsx), con
 * scroll instantáneo hasta #proceso. Mismo patrón que Manifesto/Solutions.
 *
 * Uso: npm run parity:update-oracle-process (manual).
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
        const el = document.getElementById("proceso");
        if (el) window.scrollTo({ top: el.offsetTop, left: 0, behavior: "instant" });
      });
      await page.waitForTimeout(500);
      const outPath = path.join(OUT_DIR, `process-${vp.name}-home.png`);
      writeFileSync(outPath, await page.screenshot());
      console.log(`oráculo (process): process-${vp.name}-home.png`);
      await page.close();
    }
  } finally {
    await browser.close();
  }

  console.log("\nListo. Comitea e2e/oracle/process-*.png.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
