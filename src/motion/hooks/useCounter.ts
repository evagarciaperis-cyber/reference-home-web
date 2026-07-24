"use client";

import { useEffect, useRef } from "react";
import { easeOutCubic } from "../core/easing";

// Puerto literal del bloque [data-count] de main.js.
const REVEAL_THRESHOLD = 0.5;
const DURATION_MS = 1300;
const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

/**
 * Anima cada [data-count] de 0 hasta su valor objetivo la primera vez que
 * entra en el viewport (threshold .5), con easing cúbico de salida sobre
 * 1300ms -- una sola vez por elemento, igual que el original. El valor
 * final se lee del propio atributo data-count (no de textContent, que el
 * original usa como placeholder "0" antes de animar).
 */
export function useCounter<T extends HTMLElement = HTMLElement>() {
  const containerRef = useRef<T>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const targets = Array.from(container.querySelectorAll<HTMLElement>("[data-count]"));
    const frames: number[] = [];

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          const target = Number(el.dataset.count || 0);
          const start = performance.now();

          const animate = (now: number) => {
            const t = clamp((now - start) / DURATION_MS, 0, 1);
            const eased = easeOutCubic(t);
            el.textContent = String(Math.round(target * eased));
            if (t < 1) frames.push(requestAnimationFrame(animate));
          };
          frames.push(requestAnimationFrame(animate));
          observer.unobserve(entry.target);
        });
      },
      { threshold: REVEAL_THRESHOLD },
    );
    targets.forEach((target) => observer.observe(target));

    return () => {
      observer.disconnect();
      frames.forEach((id) => cancelAnimationFrame(id));
    };
  }, []);

  return containerRef;
}
