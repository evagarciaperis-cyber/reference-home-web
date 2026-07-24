/**
 * Genera el oráculo de Stats en su estado revelado (statement con palabras
 * visibles + contadores ya animados hasta su valor final), con scroll
 * instantáneo hasta la sección. Mismo patrón que Manifesto/Principles.
 *
 * Encuadre de la captura: el FINAL del grid alineado con la parte inferior
 * del viewport (la misma posición que dispara la revelación de los
 * contadores), no el inicio de la sección. En Principles (fase 11) usar
 * section.offsetTop para el encuadre bastó porque había margen de sobra
 * frente al final de la página; en Stats, section.offsetTop resultó
 * *demasiado* cerca del final de la página del proyecto migrado en
 * tablet-768 (mientras no existan las secciones posteriores a Stats --
 * Contact/Footer, fases futuras, su altura total es menor que la del
 * oráculo completo) y el navegador lo recortaba (clamped) de forma
 * distinta en cada lado, dando un falso positivo de paridad (~14% de
 * diferencia, un desplazamiento vertical real, no ruido). Anclar el
 * encuadre al FINAL DEL GRID en vez de al inicio de la sección depende
 * solo del contenido de Stats mismo (idéntico en ambos lados, verificado),
 * nunca de lo que venga después -- inmune a este problema
 * independientemente de cuánto contenido exista más abajo, ahora o en
 * fases futuras.
 *
 * Espera determinista: waitForFunction() hasta que los 4 contadores
 * alcanzan su valor final (no un temporizador fijo de ~1300ms+margen).
 *
 * Uso: npm run parity:update-oracle-stats (manual).
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
      // El statement (arriba) y el grid de contadores (abajo, tras
      // margin-top:15vh) necesitan cada uno su propio paso de scroll para
      // pasar por el viewport y disparar su revelación -- saltar
      // directamente al final del grid puede dejar el statement sin pasar
      // nunca por el viewport (el IntersectionObserver nunca lo ve
      // intersecar). Ambas revelaciones persisten una vez activadas.
      await page.evaluate(() => {
        const section = document.querySelector(".stats") as HTMLElement | null;
        if (section) window.scrollTo({ top: section.offsetTop, left: 0, behavior: "instant" });
      });
      await page.waitForFunction(
        () => Array.from(document.querySelectorAll(".stats__statement .word")).every((el) => el.classList.contains("is-visible")),
        undefined,
        { timeout: 5000 },
      );
      await page.evaluate(() => {
        const grid = document.querySelector(".stats__grid") as HTMLElement | null;
        if (!grid) return;
        const bottom = grid.offsetTop + grid.offsetHeight - window.innerHeight;
        window.scrollTo({ top: Math.max(0, bottom), left: 0, behavior: "instant" });
      });
      await page.waitForFunction(
        () =>
          Array.from(document.querySelectorAll("[data-count]")).every(
            (el) => el.textContent === (el as HTMLElement).dataset.count,
          ),
        undefined,
        { timeout: 5000 },
      );
      // El encuadre para la captura ES esta misma posición (final del
      // grid) -- no se vuelve a scrollear al inicio de la sección, ver
      // comentario de cabecera.
      const outPath = path.join(OUT_DIR, `stats-${vp.name}-home.png`);
      writeFileSync(outPath, await page.screenshot());
      console.log(`oráculo (stats): stats-${vp.name}-home.png`);
      await page.close();
    }
  } finally {
    await browser.close();
  }

  console.log("\nListo. Comitea e2e/oracle/stats-*.png.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
