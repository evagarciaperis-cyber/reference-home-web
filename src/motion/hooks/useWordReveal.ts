"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "../core/media";
import { HERO_NARRATIVE_VH } from "../core/heroGeometry";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const REVEAL_START = 0.3; // progreso del wipe (en viewports) al que empieza a revelarse la primera palabra
const REVEAL_SPAN = 1.0; // viewports de progreso a lo largo de los que se escalonan las palabras entre sí
const REVEAL_WINDOW = 0.3; // viewports que tarda cada palabra individual en pasar de invisible a sólida
const BASE_BLUR = 10; // px de blur en una palabra aún no revelada (réplica de Cosmosia)

/**
 * Revelado palabra a palabra ligado de forma continua y reversible al
 * scroll (réplica del bloque "En nuestra agencia" de Cosmosia, inspeccionado
 * vía DevTools 2026-07-27: cada palabra es un <span> independiente que pasa
 * de opacity:0 + blur(10px) a opacity:1 + blur(0), escalonado por orden de
 * aparición en el texto).
 *
 * Deliberadamente NO usa la posición renderizada de cada palabra
 * (getBoundingClientRect) como entrada: Manifesto queda con el borde
 * superior clavado en top:0 durante buena parte de su ventana de scroll
 * (useManifestoRise.ts compensa exactamente la diferencia entre su avance
 * natural y HERO_TAIL_VH mientras el Hero sigue cubierto) -- las palabras
 * de más abajo del bloque se quedarían con su posición en pantalla
 * congelada ahí mismo, y un revelado basado en esa posición se detendría a
 * medio camino en vez de completarse. En su lugar, cada palabra tiene un
 * umbral fijo en "progreso de wipe" (mismas unidades que
 * useManifestoRise.ts: viewports de scroll desde que Hero empieza a
 * cubrirse), escalonado según la posición ESTÁTICA de la palabra dentro
 * del bloque (offsetTop, que el transform no altera). El resultado sigue
 * síendo una función directa y reversible de window.scrollY -- ya
 * suavizado por SmoothScrollProvider/Lenis -- sin CSS transition ni estado
 * de velocidad propio, pero avanza aunque el bloque esté visualmente
 * clavado en top:0.
 */
export function useWordReveal<T extends HTMLElement>() {
  const containerRef = useRef<T>(null);

  useEffect(() => {
    const container = containerRef.current;
    const hero = document.getElementById("inicio");
    if (!container || !hero || prefersReducedMotion()) return;

    const words = Array.from(container.querySelectorAll<HTMLElement>("[data-word]"));
    if (words.length === 0) return;

    let frame = 0;

    const render = () => {
      frame = 0;
      const heroRect = hero!.getBoundingClientRect();
      const heroDocTop = window.scrollY + heroRect.top;
      const viewportHeight = window.innerHeight;
      const wipeStart = heroDocTop + HERO_NARRATIVE_VH * viewportHeight;
      const wipeProgress = (window.scrollY - wipeStart) / viewportHeight; // sin clamp: sigue creciendo aunque el bloque esté clavado

      const blockHeight = container!.scrollHeight || 1;

      words.forEach((word) => {
        const fraction = clamp(word.offsetTop / blockHeight, 0, 1);
        const wordStart = REVEAL_START + fraction * REVEAL_SPAN;
        const progress = clamp((wipeProgress - wordStart) / REVEAL_WINDOW, 0, 1);

        word.style.opacity = progress.toFixed(3);
        const blur = BASE_BLUR * (1 - progress);
        word.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "";
      });
    };

    const requestRender = () => {
      if (!frame) frame = requestAnimationFrame(render);
    };

    window.addEventListener("scroll", requestRender, { passive: true });
    window.addEventListener("resize", requestRender);
    requestRender();

    return () => {
      window.removeEventListener("scroll", requestRender);
      window.removeEventListener("resize", requestRender);
      if (frame) cancelAnimationFrame(frame);
      words.forEach((word) => {
        word.style.opacity = "";
        word.style.filter = "";
      });
    };
  }, []);

  return containerRef;
}
