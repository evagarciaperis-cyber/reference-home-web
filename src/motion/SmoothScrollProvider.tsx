"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { prefersReducedMotion } from "./core/media";
import { tick as tickFrame } from "./core/frameTicker";

/**
 * Fuente única de verdad del scroll suavizado para TODA la aplicación
 * (corrección 2026-07-27: reemplaza el intento anterior de simular
 * inercia solo dentro de useManifestoRise.ts, que competía con el scroll
 * nativo en vez de sustituirlo). Lenis se instancia SIN wrapper/content
 * propios -- el valor por defecto es `window`/`document.documentElement`,
 * es decir, sigue siendo scroll nativo real, solo que Lenis lo conduce
 * suavemente frame a frame (vía lenis.raf() dentro de un único bucle
 * requestAnimationFrame de este proveedor). Como resultado,
 * window.scrollY y los eventos "scroll" nativos que YA leen useHero,
 * useWorkZoom, useBrandStory, useHorizontalGallery, useHeaderState y
 * useManifestoRise reflejan directamente la posición suavizada -- ninguno
 * de esos hooks necesita enterarse de que Lenis existe ni leer un valor
 * paralelo.
 *
 * anchors:true delega también la navegación por anclas (#contacto,
 * #proceso) en Lenis, con la misma suavidad que el resto del scroll, sin
 * código adicional. No expone la instancia (nada en el proyecto necesita
 * hoy llamar a lenis.scrollTo()/leer lenis.velocity a mano); si hiciera
 * falta más adelante, se añade entonces un useSmoothScroll() real.
 *
 * Corrección 2026-07-27: el bucle requestAnimationFrame de aquí abajo es
 * también el "requestAnimationFrame existente" que frameTicker.ts expone
 * a otros hooks que necesitan interpolar cada frame (useAmbientMotion.ts,
 * lerp del puntero en Manifesto) -- para que no abran un segundo bucle
 * RAF independiente. Bajo prefers-reduced-motion este bucle no llega a
 * arrancar, así que esos hooks tampoco reciben ticks (además de su propio
 * guard interno).
 */
export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (prefersReducedMotion()) return;

    const lenis = new Lenis({
      smoothWheel: true,
      syncTouch: false, // el táctil conserva su momentum nativo -- ver nota de accesibilidad/móvil en la petición original
      lerp: 0.09,
      wheelMultiplier: 1,
      infinite: false,
      overscroll: false,
      anchors: true,
      stopInertiaOnNavigate: true,
    });

    let frame = requestAnimationFrame(function raf(time) {
      lenis.raf(time);
      tickFrame(time);
      frame = requestAnimationFrame(raf);
    });

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);

  return children;
}
