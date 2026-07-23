"use client";

import { useEffect, useRef, useState } from "react";
import { canHover, prefersReducedMotion } from "../core/media";

// Puerto literal de la sección "const cursor = $('.cursor')" de main.js:
// mismo factor de interpolación, mismas condiciones de activación.
const LERP = 0.18;
const DEFAULT_LABEL = "Ver";

/**
 * Cursor personalizado que sigue al ratón con suavizado (lerp) y muestra un
 * texto distinto al pasar sobre cualquier elemento `[data-cursor]`.
 *
 * A diferencia del original (que hace `querySelectorAll('[data-cursor]')`
 * una sola vez al cargar el script), usa delegación de eventos sobre
 * `document` con `mouseover`/`mouseout` + `closest()`. Así reacciona a
 * cualquier elemento `data-cursor` presente ahora o añadido más tarde por
 * componentes futuros (tarjetas de proyecto, enlaces del footer...) sin que
 * este hook necesite conocerlos — mismo comportamiento visible, sin la
 * limitación de una consulta única al montar.
 */
export function useCustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!canHover() || prefersReducedMotion()) return;

    const cursor = cursorRef.current;
    if (!cursor) return;

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let tx = x;
    let ty = y;
    let frame = 0;

    const onMouseMove = (event: MouseEvent) => {
      tx = event.clientX;
      ty = event.clientY;
    };

    const loop = () => {
      x += (tx - x) * LERP;
      y += (ty - y) * LERP;
      cursor.style.left = `${x}px`;
      cursor.style.top = `${y}px`;
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    window.addEventListener("mousemove", onMouseMove);

    const onMouseOver = (event: MouseEvent) => {
      const target = (event.target as HTMLElement)?.closest?.("[data-cursor]") as HTMLElement | null;
      if (!target) return;
      if (labelRef.current) labelRef.current.textContent = target.dataset.cursor || DEFAULT_LABEL;
      setIsVisible(true);
    };

    const onMouseOut = (event: MouseEvent) => {
      const target = (event.target as HTMLElement)?.closest?.("[data-cursor]") as HTMLElement | null;
      if (!target) return;
      const related = event.relatedTarget as Node | null;
      if (related && target.contains(related)) return; // sigue dentro del mismo elemento
      setIsVisible(false);
    };

    document.addEventListener("mouseover", onMouseOver);
    document.addEventListener("mouseout", onMouseOut);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseover", onMouseOver);
      document.removeEventListener("mouseout", onMouseOut);
      cancelAnimationFrame(frame);
    };
  }, []);

  return { cursorRef, labelRef, isVisible };
}
