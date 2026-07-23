"use client";

import { useEffect, useRef } from "react";

// Puerto literal del bloque [data-parallax] de main.js.
const DEFAULT_SPEED = 0.08;

/**
 * Aplica un desplazamiento de parallax a la <img> dentro del elemento
 * referenciado, en función de la distancia entre el centro del contenedor
 * y el centro del viewport. `speed` sustituye el atributo
 * data-parallax="0.08" del original (se pasa como argumento del hook en
 * vez de leerse del DOM). No comprueba prefers-reduced-motion: el
 * original tampoco lo hace en este bloque concreto.
 */
export function useParallax<T extends HTMLElement = HTMLElement>(speed = DEFAULT_SPEED) {
  const containerRef = useRef<T>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const img = container.querySelector<HTMLElement>("img");

    const update = () => {
      const rect = container.getBoundingClientRect();
      const offset = (window.innerHeight * 0.5 - (rect.top + rect.height * 0.5)) * speed;
      if (img) img.style.transform = `scale(1.08) translate3d(0,${offset}px,0)`;
    };

    window.addEventListener("scroll", update, { passive: true });
    update();

    return () => window.removeEventListener("scroll", update);
  }, [speed]);

  return containerRef;
}
