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
 * Espera a que una lectura de la página (p.ej. el transform/--card-scale
 * de las tarjetas de ProjectsGallery) deje de cambiar entre dos lecturas
 * consecutivas, en vez de una espera fija a ciegas.
 *
 * Sustituye a un waitForTimeout arbitrario cuando lo que hay que esperar
 * es que una transición CSS (p.ej. .18s en --card-scale/--image-scale)
 * termine de verdad. Un margen fijo, por generoso que sea, sigue siendo
 * una apuesta bajo contención real de CPU: con la suite completa en
 * paralelo, 300ms y luego 600ms resultaron insuficientes de forma
 * intermitente (Fase 7/8, un test distinto fallaba en cada ejecución
 * completa, siempre estable en aislado). Poll determinista en vez de
 * aumentar otra vez el número a ciegas.
 */
export async function waitForStable(
  read: () => Promise<string>,
  { intervalMs = 60, maxWaitMs = 4000 }: { intervalMs?: number; maxWaitMs?: number } = {},
): Promise<void> {
  const start = Date.now();
  let previous = await read();
  while (Date.now() - start < maxWaitMs) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    const current = await read();
    if (current === previous) return;
    previous = current;
  }
}

/**
 * Oculta todo excepto el header (por defecto [data-header], presente tanto
 * en el oráculo como en el proyecto nuevo) y fuerza un fondo plano e
 * idéntico en ambos lados. El header es transparente en su estado inicial
 * — sin esto, compararlo por píxel confundiría "falta contenido de la home"
 * con una regresión real del propio header.
 */
/**
 * Oculta el header. Úsalo cuando el header en sí no es lo que se está
 * validando y su micro-estado puede introducir una diferencia no
 * determinista ajena a la sección bajo prueba.
 *
 * Caso real (fase 9, WorkZoom): el propio original tiene una carrera
 * genuina entre el listener de 'scroll' de updateHeader() y su segunda
 * invocación explícita dentro de renderWorkZoom() cuando la inmersión
 * cambia de estado en ESE mismo scroll -- reproducido y confirmado
 * también en el HTML original sin tocar (saltando directamente a un
 * punto avanzado del recorrido). Cuál de los puntos del recorrido
 * coincide exactamente con el frame en que la inmersión cruza el umbral
 * depende de redondeos de scrollY específicos de cada viewport, así que
 * no es fiable fijarlo a un checkpoint concreto ni en el oráculo ni en
 * el test. Ocultar el header deja la comparación de píxel centrada en
 * la mecánica real del zoom (que sí es determinista), sin depender de
 * esa carrera; la fidelidad del propio header ya se valida aparte en
 * header.spec.ts (fase 3).
 */
export async function hideHeader(page: Page, selector = "[data-header]"): Promise<void> {
  await page.addStyleTag({
    content: `${selector} { visibility: hidden !important; }`,
  });
}

export async function isolateHeader(page: Page, selector = "[data-header]"): Promise<void> {
  await page.addStyleTag({
    content: `
      html, body { background: #808080 !important; }
      body > *:not(${selector}) { visibility: hidden !important; }
    `,
  });
}
