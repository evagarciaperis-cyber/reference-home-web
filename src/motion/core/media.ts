// Utilidades de detección de entorno compartidas por varios hooks de
// animación (docs/ARQUITECTURA.md, sección 9). Solo deben llamarse desde
// efectos/manejadores del lado del cliente (nunca durante el render de SSR).

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function canHover(): boolean {
  return window.matchMedia("(pointer: fine)").matches;
}
