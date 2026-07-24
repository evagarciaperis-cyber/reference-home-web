// Funciones de easing compartidas por los hooks de motion que las
// necesitan (WorkZoom y BrandStory, fases 9/10 -- primeras en requerirlas,
// mismo criterio ya usado para media.ts en la fase 2).

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
