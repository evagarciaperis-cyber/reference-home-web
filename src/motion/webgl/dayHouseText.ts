// Tiempos de los titulares de la portada («Se valora», «Se muestra»…). Va aparte de
// dayHouseScene.ts para que la portada pueda moverlos sin cargar three.js, que se
// descarga más tarde (al primer gesto) para que la página cargue rápida.
// Ventanas de cada texto: [entra desde, formado en, empieza a irse, se ha ido].
// El primero (logo) entra con el tiempo de la apertura, no con el scroll.
export const TEXT_WINDOWS: Array<[number, number, number, number]> = [
  [-1, -1, 0.0, 0.05], // logo
  [0.04, 0.09, 0.15, 0.21], // Se valora.
  [0.27, 0.33, 0.39, 0.45], // Se muestra.
  [0.55, 0.61, 0.67, 0.73], // Se negocia.
  [0.85, 0.91, 2, 2], // Se vende. (se queda)
];

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

export function textState(p: number, intro: number): { index: number; amt: number } {
  for (let i = 0; i < TEXT_WINDOWS.length; i++) {
    const [a, b, c, d] = TEXT_WINDOWS[i];
    if (i === 0) {
      if (p < d) {
        const formed = clamp01((intro - 0.35) / 0.5);
        const leaving = 1 - clamp01((p - c) / (d - c));
        return { index: 0, amt: Math.min(formed, leaving) };
      }
      continue;
    }
    if (p >= a && p < d) {
      const inAmt = clamp01((p - a) / (b - a));
      const outAmt = 1 - clamp01((p - c) / (d - c));
      return { index: i, amt: Math.min(inAmt, outAmt) };
    }
  }
  return { index: -1, amt: 0 };
}

