// Utilidades de detección de entorno compartidas por varios hooks de
// animación (docs/ARQUITECTURA.md, sección 9). Solo deben llamarse desde
// efectos/manejadores del lado del cliente (nunca durante el render de SSR).

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function canHover(): boolean {
  return window.matchMedia("(pointer: fine)").matches;
}

// ---------------------------------------------------------------------------
// Breakpoints -- fuente única de verdad para todo el proyecto. Antes de esta
// refactorización, cada hook declaraba su propia copia local de estas mismas
// cadenas (p. ej. `const DESKTOP_QUERY = "(min-width: 901px)";` repetido en
// seis archivos distintos) -- puro número mágico duplicado, sin ningún
// cambio de comportamiento al centralizarlo aquí: cada hook sigue llamando a
// `window.matchMedia(...).matches` exactamente igual que antes, solo que
// ahora importa la cadena en vez de declararla.
//
// DESKTOP_BREAKPOINT_PX (901) es el breakpoint MAESTRO del proyecto: separa
// la experiencia desktop (pin real de GSAP ScrollTrigger, header con
// revelado por hover) de la experiencia táctil/vertical (mobile + tablet,
// sin pin, layout estático o apilado propio). Heredado literalmente de
// `main.js` del sitio original (docs/ARQUITECTURA.md, líneas 308 y 383, que
// ya lo declaraba invariante) y confirmado como estándar único tras la
// auditoría de arquitectura de breakpoints -- usado hoy por useHeaderState,
// useProcess, useTeamFanEntrance, useHorizontalGallery, useBrandStory y
// useFinalReveal.
export const DESKTOP_BREAKPOINT_PX = 901;
export const DESKTOP_QUERY = `(min-width: ${DESKTOP_BREAKPOINT_PX}px)`;

// Complementario exacto de DESKTOP_QUERY (901 - 1), para el caso puntual en
// que un hook necesita comprobar "no-desktop" con max-width en vez de
// min-width (useBuyerExperience). Derivado del mismo número: no puede
// desincronizarse nunca de DESKTOP_QUERY.
export const MOBILE_TABLET_QUERY = `(max-width: ${DESKTOP_BREAKPOINT_PX - 1}px)`;

// Umbral más estrecho, usado hoy solo por MarketingReel, SellingErrors y
// BrandPause -- una desviación conocida del breakpoint maestro (ver
// auditoría de arquitectura de breakpoints), NO un segundo estándar válido
// del proyecto. Se centraliza aquí tal cual, sin corregir su valor: esta
// refactorización es solo de deduplicación de números mágicos, nunca de
// comportamiento -- alinear estas tres secciones a DESKTOP_BREAKPOINT_PX
// queda pendiente como cambio de comportamiento explícito, fuera de alcance
// aquí.
export const COMPACT_MOBILE_BREAKPOINT_PX = 640;
export const MOBILE_QUERY = `(max-width: ${COMPACT_MOBILE_BREAKPOINT_PX}px)`;

// Umbral anidado DENTRO de la banda desktop (>=901px) para mejoras
// progresivas puntuales -- hoy solo el handoff horizontal entre
// SellingErrors y BrandPause. No compite con DESKTOP_BREAKPOINT_PX como
// breakpoint maestro, es una condición adicional más estricta que se evalúa
// una vez que ya se sabe "esto es desktop".
export const WIDE_DESKTOP_BREAKPOINT_PX = 1024;
export const WIDE_DESKTOP_QUERY = `(min-width: ${WIDE_DESKTOP_BREAKPOINT_PX}px)`;
