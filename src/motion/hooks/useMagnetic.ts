"use client";

import { useEffect, useRef } from "react";
import { canHover, prefersReducedMotion } from "../core/media";

// Puerto literal del bloque ".magnetic" de main.js.
const PULL_FACTOR = 0.12;

/**
 * Devuelve un ref para atar a cualquier elemento que deba "tirar" hacia el
 * cursor al pasar por encima (docs/ARQUITECTURA.md, sección 9). Reutilizable
 * por cualquier elemento con la clase .magnetic del original, sin duplicar
 * la lógica de mousemove/mouseleave en cada consumidor.
 */
export function useMagnetic<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!canHover() || prefersReducedMotion()) return;
    const el = ref.current;
    if (!el) return;

    const onMouseMove = (event: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      el.style.transform = `translate(${x * PULL_FACTOR}px,${y * PULL_FACTOR}px)`;
    };
    const onMouseLeave = () => {
      el.style.transform = "";
    };

    el.addEventListener("mousemove", onMouseMove);
    el.addEventListener("mouseleave", onMouseLeave);

    return () => {
      el.removeEventListener("mousemove", onMouseMove);
      el.removeEventListener("mouseleave", onMouseLeave);
      el.style.transform = "";
    };
  }, []);

  return ref;
}
