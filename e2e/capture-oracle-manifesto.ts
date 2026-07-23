/**
 * Genera el oráculo de Manifesto: a diferencia de Header/Hero, esta sección
 * no está en el viewport inicial (aparece al hacer scroll), así que hace
 * falta desplazar hasta ella antes de capturar. Scroll instantáneo (no
 * scroll-behavior:smooth, que animaría el desplazamiento y daría un
 * resultado no determinista entre capturas) hasta que #estudio queda
 * alineado con la parte superior del viewport -- por encima del umbral de
 * intersección (0.28) de data-split-reveal, así que la revelación de
 * palabras se dispara igual en el oráculo y en el proyecto nuevo.
 *
 * Uso: npm run parity:update-oracle-manifesto (manual, igual que los otros).
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
      await page.waitForSelector(".hero.is-ready", { timeout: 5000 }).catch(() => {});
      await neutralizeLoopAnimations(page);
      await page.evaluate(() => {
        const el = document.getElementById("estudio");
        if (el) window.scrollTo({ top: el.offsetTop, left: 0, behavior: "instant" });
      });
      // Dispara el IntersectionObserver + el escalonado de 28ms/palabra
      // (~20 palabras => ~560ms) + margen, y deja asentado el parallax.
      await page.waitForTimeout(1500);
      const outPath = path.join(OUT_DIR, `manifesto-${vp.name}-home.png`);
      writeFileSync(outPath, await page.screenshot());
      console.log(`oráculo (manifesto): manifesto-${vp.name}-home.png`);
      await page.close();
    }
  } finally {
    await browser.close();
  }

  console.log("\nListo. Comitea e2e/oracle/manifesto-*.png.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
