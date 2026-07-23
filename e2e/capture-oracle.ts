/**
 * Genera el oráculo de paridad: capturas congeladas de web-nueva/ (la web de
 * referencia) para cada ruta y viewport de la matriz. Se ejecuta a mano, solo
 * cuando se amplía la matriz (nueva ruta/viewport) — NUNCA para "actualizar"
 * una captura existente, porque el oráculo es por definición inmutable.
 *
 * Uso: npm run parity:update-oracle
 *
 * Requiere que ../web-nueva exista en el mismo equipo (no se usa en CI: el
 * oráculo generado aquí se comitea en e2e/oracle/ y de ahí en adelante
 * parity.spec.ts solo lee esos ficheros, sin depender de web-nueva/).
 */
import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { ALL_VIEWPORTS, ROUTES } from "./matrix";
import { settle } from "./utils/settle";

const ORACLE_SITE_ROOT = path.resolve(__dirname, "..", "..", "web-nueva");
const OUT_DIR = path.join(__dirname, "oracle");

async function main() {
  if (!existsSync(ORACLE_SITE_ROOT)) {
    console.error(`No se encuentra web-nueva/ en ${ORACLE_SITE_ROOT}.`);
    console.error("Este script solo puede ejecutarse en un equipo donde exista la carpeta de referencia.");
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();

  try {
    for (const route of ROUTES) {
      const fileUrl = pathToFileURL(path.join(ORACLE_SITE_ROOT, route.oracleFile)).href;
      for (const vp of ALL_VIEWPORTS) {
        const page = await browser.newPage({
          viewport: { width: vp.width, height: vp.height },
          reducedMotion: vp.reducedMotion ? "reduce" : "no-preference",
        });
        await page.goto(fileUrl);
        await settle(page);
        const outPath = path.join(OUT_DIR, `${vp.name}-${route.name}.png`);
        const buffer = await page.screenshot();
        writeFileSync(outPath, buffer);
        await page.close();
        console.log(`oráculo: ${vp.name}-${route.name}.png`);
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`\nListo. ${ROUTES.length * ALL_VIEWPORTS.length} capturas escritas en ${OUT_DIR}.`);
  console.log("Revísalas y comitea e2e/oracle/ — es el oráculo de paridad de aquí en adelante.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
