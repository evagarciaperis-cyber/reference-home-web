import type { Page } from "@playwright/test";

// Animaciones CSS en bucle infinito de web-nueva (assets/css/styles.css):
// hero__orb, work-zoom__scroll y brand-story__caption. Sin fase fija, dos
// capturas cualesquiera del mismo estado "final" divergirían solo por esto.
// Se neutralizan para que la captura sea determinista; el resto de
// transiciones (preloader, reveal del hero) son de un solo disparo y se
// esperan de forma natural, no se recortan.
const INFINITE_LOOP_SELECTORS = [
  ".hero__orb",
  ".work-zoom__scroll i:after",
  ".brand-story__caption i:after",
].join(", ");

/**
 * Deja la página en un estado visualmente estable antes de capturar:
 * congela animaciones en bucle infinito y espera a que termine la
 * secuencia de entrada (preloader -> hero) si existe en la ruta.
 */
export async function settle(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `${INFINITE_LOOP_SELECTORS} { animation: none !important; }`,
  });

  // No todas las rutas tienen preloader/hero (p. ej. futuras páginas internas).
  await page.waitForSelector(".hero.is-ready", { timeout: 5000 }).catch(() => {});
  // Margen para que terminen las transiciones escalonadas de las líneas del hero
  // (1.25s + hasta 0.16s de retardo, ver assets/js/main.js).
  await page.waitForTimeout(1700);

  await page.evaluate(() => document.fonts?.ready).catch(() => {});
}

/**
 * Congela una animación CSS en su estado inicial (útil para capturar un
 * instante determinista de algo que normalmente progresa con el tiempo,
 * como la barra de carga del preloader).
 */
export async function freezeAnimation(page: Page, selector: string): Promise<void> {
  await page.addStyleTag({
    content: `${selector} { animation: none !important; width: 0 !important; }`,
  });
}

/**
 * Oculta todo excepto el header (por defecto [data-header], presente tanto
 * en el oráculo como en el proyecto nuevo) y fuerza un fondo plano e
 * idéntico en ambos lados. El header es transparente en su estado inicial
 * — sin esto, compararlo por píxel confundiría "falta contenido de la home"
 * con una regresión real del propio header.
 */
export async function isolateHeader(page: Page, selector = "[data-header]"): Promise<void> {
  await page.addStyleTag({
    content: `
      html, body { background: #808080 !important; }
      body > *:not(${selector}) { visibility: hidden !important; }
    `,
  });
}
