/**
 * Genera el oráculo de Header y MobileMenu a partir de web-nueva/:
 *
 * - header-<viewport>-home.png: el header en su estado inicial (arriba del
 *   todo, transparente), aislado del resto de la home (que aún no existe en
 *   el proyecto nuevo) ocultando todo lo demás y forzando un fondo plano
 *   idéntico en ambos lados — ver isolateHeader() en utils/settle.ts.
 *   Se genera para los 5 viewports (el layout difere por encima/debajo de
 *   900px: nav de escritorio vs. botón de menú).
 * - mobile-menu-open-<viewport>-home.png: el menú móvil abierto. Al ser una
 *   capa opaca a pantalla completa (igual que el Preloader en la Fase 2),
 *   cubre cualquier contenido detrás — comparación de paridad válida ahora
 *   mismo. Solo en los viewports donde el botón de menú está visible
 *   (≤900px: mobile-375, tablet-768). El estado final no depende de
 *   reduced-motion (solo cambia la velocidad de la transición de apertura,
 *   no el resultado), así que no hace falta una variante reduced aparte.
 *
 * Uso: npm run parity:update-oracle-header (manual).
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { VIEWPORTS, ROUTES } from "./matrix";
import { isolateHeader } from "./utils/settle";

const ORACLE_SITE_ROOT = path.resolve(__dirname, "..", "..", "web-nueva");
const OUT_DIR = path.join(__dirname, "oracle");
const MOBILE_MENU_MAX_WIDTH = 900;

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
      await page.waitForTimeout(300);
      await isolateHeader(page);

      const box = await page.locator("[data-header]").boundingBox();
      if (!box) throw new Error(`No se pudo medir el header en ${vp.name}`);

      const outPath = path.join(OUT_DIR, `header-${vp.name}-home.png`);
      writeFileSync(outPath, await page.screenshot({ clip: { x: 0, y: 0, width: vp.width, height: box.height } }));
      console.log(`oráculo (header): header-${vp.name}-home.png`);
      await page.close();

      if (vp.width <= MOBILE_MENU_MAX_WIDTH) {
        const menuPage = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
        await menuPage.goto(fileUrl);
        await menuPage.waitForSelector(".hero.is-ready", { timeout: 5000 }).catch(() => {});
        await menuPage.click(".menu-toggle");
        await menuPage.waitForTimeout(900); // transición de apertura: 0.8s
        const menuOutPath = path.join(OUT_DIR, `mobile-menu-open-${vp.name}-home.png`);
        writeFileSync(menuOutPath, await menuPage.screenshot());
        console.log(`oráculo (mobile-menu): mobile-menu-open-${vp.name}-home.png`);
        await menuPage.close();
      }
    }
  } finally {
    await browser.close();
  }

  console.log("\nListo. Comitea e2e/oracle/header-*.png y e2e/oracle/mobile-menu-open-*.png.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
