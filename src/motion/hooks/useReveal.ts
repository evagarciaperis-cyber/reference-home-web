"use client";

import { useEffect, useRef } from "react";

// Puerto literal del bloque [data-reveal] de main.js.
const REVEAL_THRESHOLD = 0.18;

/**
 * Revela cada elemento marcado con [data-reveal] dentro del contenedor la
 * primera vez que entra en el viewport (threshold 0.18), una sola vez cada
 * uno -- sin escalonado (a diferencia de useSplitReveal/[data-split-reveal],
 * que si aplica un retraso por palabra). El original observa cada elemento
 * con la MISMA instancia de IntersectionObserver; aquí se reproduce igual,
 * solo que acotado al contenedor de la sección en vez de todo el documento
 * (hoy Principles es el único consumidor).
 *
 * data-visible (no una clase) para no depender de nombres de clase de CSS
 * Modules -- mismo criterio que data-word en useSplitReveal (fase 5). No
 * comprueba prefers-reduced-motion: el original tampoco lo hace aquí.
 */
export function useReveal<T extends HTMLElement = HTMLElement>() {
  const containerRef = useRef<T>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const targets = Array.from(container.querySelectorAll<HTMLElement>("[data-reveal]"));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.setAttribute("data-visible", "true");
          observer.unobserve(entry.target);
        });
      },
      { threshold: REVEAL_THRESHOLD },
    );
    targets.forEach((target) => observer.observe(target));

    return () => observer.disconnect();
  }, []);

  return containerRef;
}
