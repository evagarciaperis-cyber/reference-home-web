/**
 * Genera el oráculo de Principles en su estado revelado (los 4
 * [data-reveal] ya visibles tras cruzar el umbral de intersección), con
 * scroll instantáneo hasta la sección. Mismo patrón que Manifesto/
 * Solutions/Process: un único estado "en reposo" basta -- aquí no hay
 * recorrido posicional, solo una revelación de una sola vez por elemento.
 *
 * Espera determinista, no un temporizador fijo: waitForFunction() hasta
 * que el IntersectionObserver marque los 4 elementos, y waitForStable()
 * hasta que la transición CSS de opacity/transform (.8s) termine de
 * verdad -- ver la instrucción de evitar esperas fijas nuevas cuando el
 * estado se puede detectar.
 *
 * Uso: npm run parity:update-oracle-principles (manual).
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Page } from "@playwright/test";
import { VIEWPORTS, ROUTES } from "./matrix";
import { neutralizeLoopAnimations, waitForStable } from "./utils/settle";

const ORACLE_SITE_ROOT = path.resolve(__dirname, "..", "..", "web-nueva");
const OUT_DIR = path.join(__dirname, "oracle");

async function readPrinciplesFrame(page: Page): Promise<string> {
  return page.evaluate(() => {
    const items = Array.from(document.querySelectorAll(".principles__list article"));
    return items
      .map((el) => {
        const style = getComputedStyle(el);
        return `${style.opacity}|${style.transform}`;
      })
      .join(";");
  });
}

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
      // Primero se hace scroll hasta el FINAL de la lista (no el inicio de
      // la sección: el título tiene un margen vertical grande, 13vh/10vh,
      // que deja los [data-reveal] fuera del viewport si solo se alinea la
      // sección) para que los 4 elementos pasen por el viewport y disparen
      // su revelación -- una vez revelado, un elemento no vuelve a
      // ocultarse (revealObserver los deja de observar), así que el orden
      // de scroll no afecta al resultado final.
      await page.evaluate(() => {
        const list = document.querySelector(".principles__list") as HTMLElement | null;
        if (!list) return;
        const bottom = list.offsetTop + list.offsetHeight - window.innerHeight;
        window.scrollTo({ top: Math.max(0, bottom), left: 0, behavior: "instant" });
      });
      await page.waitForFunction(
        () => Array.from(document.querySelectorAll(".principles__list article")).every((el) => el.classList.contains("is-visible")),
        undefined,
        { timeout: 5000 },
      );
      // Encuadre real de la captura: el inicio de LA SECCIÓN (no de la
      // lista) alineado con la parte superior del viewport -- el estado ya
      // revelado persiste independientemente del encuadre. Se evita
      // list.offsetTop aquí a propósito: mientras el proyecto migrado no
      // tenga las secciones que van después de Principles (Stats/Contact/
      // Footer, fases futuras), su altura total de página es menor que la
      // del oráculo completo, así que un scroll cercano al final de la
      // página puede quedar recortado (clamped) de forma distinta en cada
      // lado. .principles.offsetTop deja margen de sobra en ambos casos.
      await page.evaluate(() => {
        const section = document.querySelector(".principles") as HTMLElement | null;
        if (section) window.scrollTo({ top: section.offsetTop, left: 0, behavior: "instant" });
      });
      await waitForStable(() => readPrinciplesFrame(page));
      const outPath = path.join(OUT_DIR, `principles-${vp.name}-home.png`);
      writeFileSync(outPath, await page.screenshot());
      console.log(`oráculo (principles): principles-${vp.name}-home.png`);
      await page.close();
    }
  } finally {
    await browser.close();
  }

  console.log("\nListo. Comitea e2e/oracle/principles-*.png.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
