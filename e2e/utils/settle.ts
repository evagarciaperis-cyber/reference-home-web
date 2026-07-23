import type { Page } from "@playwright/test";

// Animaciones CSS en bucle infinito de web-nueva (assets/css/styles.css):
// hero__orb, work-zoom__scroll y brand-story__caption. Sin fase fija, dos
// capturas cualesquiera del mismo estado "final" divergirían solo por esto.
// Se neutralizan para que la captura sea determinista; el resto de
// transiciones (preloader, reveal del hero) son de un solo disparo y se
// esperan de forma natural, no se recortan.
//
// Los selectores de clase literal (.hero__orb...) solo existen con ese
// nombre en el oráculo — en el proyecto nuevo, con CSS Modules, la clase
// real va con hash y nunca coincide (bug real encontrado en la Fase 4: el
// orb del Hero seguía animándose sin neutralizar en las capturas del
// proyecto nuevo). [data-loop-anim] es la convención para el lado nuevo:
// cualquier elemento con una animación CSS en bucle infinito se marca con
// ese atributo (ver Hero.tsx) y esta lista no necesita volver a tocarse
// cuando se migren WorkZoom/BrandStory.
const INFINITE_LOOP_SELECTORS = [
  ".hero__orb",
  ".work-zoom__scroll i:after",
  ".brand-story__caption i:after",
  "[data-loop-anim]",
].join(", ");

// Duración de la secuencia de entrada más larga posible: preloader (780ms)
// + reveal escalonado del Hero (1.25s + hasta 0.16s de retardo) + margen.
const ENTRANCE_SEQUENCE_MS = 2500;

/**
 * Congela las animaciones CSS en bucle infinito (ver INFINITE_LOOP_SELECTORS
 * arriba). Se exporta aparte de settle() porque los scripts de oráculo por
 * sección (manifesto, solutions...) necesitan aplicar esto ANTES de su
 * propio scroll/espera a medida, no la secuencia completa de settle().
 *
 * Bug real encontrado en la Fase 6: capture-oracle-solutions.ts no la
 * aplicaba, y el orb del Hero (aun con overflow:hidden y muy lejos del
 * scroll) dejaba un artefacto de composición GPU reproducible (línea de
 * ~57% opacidad de --acid, 1-2px) cerca de la parte superior del viewport
 * en el oráculo de Solutions. Confirmado con el orb neutralizado: el
 * artefacto desaparece por completo. No es un defecto de Solutions.tsx.
 */
export async function neutralizeLoopAnimations(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `${INFINITE_LOOP_SELECTORS} { animation: none !important; }`,
  });
}

/**
 * Deja la página en un estado visualmente estable antes de capturar:
 * congela animaciones en bucle infinito y espera a que termine la
 * secuencia de entrada (preloader -> hero) si existe en la ruta.
 *
 * Corrección: la versión original esperaba el selector ".hero.is-ready",
 * que solo existe con ese nombre literal en el oráculo (web-nueva). En el
 * proyecto nuevo, Hero usa CSS Modules -- la clase real va con hash y ese
 * selector nunca coincide, así que la espera degradaba silenciosamente al
 * timeout completo (5s) antes de seguir. Una espera fija tras `load`
 * funciona igual para ambos lados sin depender de ningún nombre de clase.
 */
export async function settle(page: Page): Promise<void> {
  await neutralizeLoopAnimations(page);

  await page.waitForLoadState("load");
  await page.waitForTimeout(ENTRANCE_SEQUENCE_MS);

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
