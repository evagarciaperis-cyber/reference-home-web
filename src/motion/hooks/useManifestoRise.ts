"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "../core/media";
import { HERO_NARRATIVE_VH } from "../core/heroGeometry";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Aplica un desplazamiento vertical (translateY puro, nunca escala ni
 * skew -- el borde superior de la sección se mantiene recto) a Manifesto.
 *
 * Corrección 2026-07-27 (arquitectura definitiva): este hook YA NO
 * simula inercia por su cuenta -- esa responsabilidad es de
 * SmoothScrollProvider.tsx (Lenis), única fuente de verdad del scroll
 * suavizado para toda la aplicación. window.scrollY ya es la posición
 * suavizada real (Lenis conduce el scroll nativo, no uno paralelo), así
 * que este hook vuelve a ser un cálculo geométrico puro y directo, sin
 * muelle ni estado propio de velocidad -- exactamente como cualquier
 * otro hook de progreso de scroll del proyecto (useHero, useWorkZoom,
 * useBrandStory, useHorizontalGallery): un handler de "scroll" con
 * throttle a un frame vía requestAnimationFrame, sin bucle persistente.
 *
 * Geometría (ver heroGeometry.ts): el contenedor del Hero mide
 * HERO_TOTAL_VH viewports, uno más de lo que necesitan la narrativa
 * (HERO_NARRATIVE_VH) y el tramo de cola (HERO_TAIL_VH) juntos -- ese
 * viewport de sobra es lo que mantiene el sticky del Hero pinneado hasta
 * que Manifesto lo ha cubierto del todo. Efecto colateral: el flujo
 * NATURAL de Manifesto (sin ningún transform) solo llega a top:0 al
 * final de ese contenedor más largo, no al final del tramo de cola. Este
 * hook calcula en cada frame la posición REAL que debería verse
 * (desiredTopY, función directa del progreso de scroll) y la posición
 * que el flujo natural produciría en ese scrollY (naturalTopY), y aplica
 * exactamente la diferencia. Por construcción, la posición mostrada es
 * siempre `desiredTopY` sin importar cuánto se haya alargado el
 * contenedor por detrás -- el Hero, mientras tanto, no se mueve en
 * absoluto (se mantiene sticky durante toda esta ventana, verificado por
 * medición).
 */
export function useManifestoRise<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    const hero = document.getElementById("inicio");
    if (!el || !hero || prefersReducedMotion()) return;

    let frame = 0;

    const render = () => {
      frame = 0;
      const heroRect = hero!.getBoundingClientRect();
      const heroDocTop = window.scrollY + heroRect.top;
      const viewportHeight = window.innerHeight;
      const wipeStart = heroDocTop + HERO_NARRATIVE_VH * viewportHeight;
      const outerBottom = heroDocTop + heroRect.height;
      const scrollY = window.scrollY;

      if (scrollY < wipeStart - 1 || scrollY > outerBottom + 1) {
        // Fuera de la ventana relevante: por debajo, Manifesto está de
        // sobra fuera del viewport pase lo que pase; por encima, el
        // flujo natural ya coincide exactamente con top:0. Sin
        // transform en ambos casos.
        el!.style.transform = "";
        return;
      }

      const target = clamp((scrollY - wipeStart) / viewportHeight, 0, 1);
      const naturalTopY = outerBottom - Math.min(scrollY, outerBottom);
      const desiredTopY = viewportHeight * (1 - target);
      const offsetPx = desiredTopY - naturalTopY;
      el!.style.transform = Math.abs(offsetPx) > 0.05 ? `translateY(${offsetPx.toFixed(2)}px)` : "";
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
      el.style.transform = "";
    };
  }, []);

  return ref;
}
