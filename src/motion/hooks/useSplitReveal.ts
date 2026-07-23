"use client";

import { useEffect, useRef } from "react";

// Puerto literal del bloque [data-split-reveal] de main.js.
const REVEAL_THRESHOLD = 0.28;
const STAGGER_MS = 28;

/**
 * Revela cada palabra de un contenedor con un retraso escalonado (28ms) la
 * primera vez que entra en el viewport (threshold 0.28), una sola vez.
 *
 * El original inyecta `<span class="word">` por JS y les añade la clase
 * `is-visible`. Aquí el marcado de las palabras lo genera el componente
 * (ver Manifesto.tsx), marcándolas con `data-word`; el hook activa
 * `data-visible` en cada una con el mismo temporizador que el original,
 * sin conocer nada de CSS Modules -- el estilo final (opacidad) lo decide
 * el CSS Module de cada sección a través de ese atributo. No comprueba
 * prefers-reduced-motion: el original tampoco lo hace aquí (a diferencia
 * de cursor/magnetic), la transición se acelera solo por el override
 * global de reset.css.
 */
export function useSplitReveal<T extends HTMLElement = HTMLElement>() {
  const containerRef = useRef<T>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const timeouts: number[] = [];

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const words = container.querySelectorAll<HTMLElement>("[data-word]");
          words.forEach((word, i) => {
            timeouts.push(window.setTimeout(() => word.setAttribute("data-visible", "true"), i * STAGGER_MS));
          });
          observer.unobserve(entry.target);
        });
      },
      { threshold: REVEAL_THRESHOLD },
    );
    observer.observe(container);

    return () => {
      observer.disconnect();
      timeouts.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  return containerRef;
}
