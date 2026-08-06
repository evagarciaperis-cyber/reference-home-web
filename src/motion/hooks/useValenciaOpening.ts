"use client";

import type { RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion, DESKTOP_QUERY } from "../core/media";
import { subscribeFrame } from "../core/frameTicker";
import { useIsomorphicLayoutEffect } from "../core/useIsomorphicLayoutEffect";

let pluginRegistered = false;

// Fracción del progreso (0..1) en la que el titular ya está totalmente
// asentado -- deliberadamente pequeña: es una "entrada mínima" (pedido
// explícito), no un tramo de lectura propio. A partir de aquí el resto
// del scroll de la escena es la deriva de la foto y, al final, la
// cubierta.
const TITLE_SETTLE_END = 0.15;

// Fracción a partir de la cual empieza a subir la cubierta (hasta 1).
const COVER_RISE_START = 0.62;

type Refs = {
  sectionRef: RefObject<HTMLElement | null>;
  photoRef: RefObject<HTMLDivElement | null>;
  titleGroupRef: RefObject<HTMLDivElement | null>;
  coverRef: RefObject<HTMLDivElement | null>;
};

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/**
 * Escena 01 "La fachada" (docs/INMOBILIARIA_VALENCIA_STORYBOARD.md) --
 * apertura corta y directa, sin pin real de GSAP: contenedor alto
 * (.opening, 170svh) + escenario `position: sticky` (CSS puro, mismo
 * patrón ya estable de useBuyerExperience.ts/useBuyerReveal.ts) + un
 * único ScrollTrigger con scrub que expone `self.progress` 0..1 sobre la
 * altura propia del contenedor ("bottom bottom" cae exactamente al
 * liberarse el sticky, sin spacer ni pin-spacer -- nada que revertir al
 * desmontar, así que no aplica aquí el fix de useFinalReveal.ts, pero se
 * usa igualmente `useIsomorphicLayoutEffect` para fijar el estado inicial
 * antes del primer pintado, sin excepción).
 *
 * Tres movimientos, todos por `translate`, nunca por fade/blur/zoom:
 *  1. El titular se asienta (traducción vertical, con la opacidad solo
 *     como apoyo muy contenido -- de 0.9 a 1, nunca de 0 a 1) en el
 *     primer 15% del progreso.
 *  2. La fotografía deriva unos pocos píxeles en `y` a lo largo de TODO
 *     el progreso -- el "casi nada dramático, como respirando" del
 *     storyboard.
 *  3. En el último tramo, una cubierta sólida (mismo color que el fondo
 *     de la escena siguiente) sube desde fuera del encuadre (`yPercent`
 *     100 -> 0) hasta ocupar toda la fotografía -- nunca una capa de
 *     opacity: es un plano físico que entra por abajo, como pedido.
 *
 * Sin RAF propio: se suscribe al ticker compartido
 * (`subscribeFrame(() => ScrollTrigger.update())`), igual que el resto
 * de hooks GSAP del proyecto.
 */
export function useValenciaOpening({ sectionRef, photoRef, titleGroupRef, coverRef }: Refs): void {
  useIsomorphicLayoutEffect(() => {
    const section = sectionRef.current;
    const photo = photoRef.current;
    const titleGroup = titleGroupRef.current;
    const cover = coverRef.current;
    if (!section || !photo || !titleGroup || !cover) return;
    if (prefersReducedMotion()) return;

    if (!pluginRegistered) {
      gsap.registerPlugin(ScrollTrigger);
      pluginRegistered = true;
    }

    // Magnitudes menores en mobile/tablet -- el gesto sigue existiendo,
    // solo es más contenido (pantallas más pequeñas, menos recorrido
    // físico de scroll por vh real). Mismo breakpoint maestro que el
    // resto del proyecto (DESKTOP_QUERY, 901px).
    const isDesktop = window.matchMedia(DESKTOP_QUERY).matches;
    const titleOffsetPx = isDesktop ? 18 : 12;
    const photoDriftPx = isDesktop ? 24 : 12;

    // Estado inicial explícito -- coincide con la base CSS (sin flash al
    // hidratar): titular ligeramente por asentar, foto en reposo, cubierta
    // completamente fuera de encuadre por abajo.
    gsap.set(titleGroup, { y: titleOffsetPx, opacity: 0.9 });
    gsap.set(photo, { y: 0 });
    gsap.set(cover, { yPercent: 100 });

    const trigger = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const p = self.progress;

        const titleP = clamp01(p / TITLE_SETTLE_END);
        gsap.set(titleGroup, {
          y: lerp(titleOffsetPx, 0, titleP),
          opacity: lerp(0.9, 1, titleP),
        });

        gsap.set(photo, { y: lerp(0, -photoDriftPx, p) });

        const coverP = clamp01((p - COVER_RISE_START) / (1 - COVER_RISE_START));
        gsap.set(cover, { yPercent: lerp(100, 0, coverP) });
      },
    });

    const unsubscribe = subscribeFrame(() => ScrollTrigger.update());

    return () => {
      unsubscribe();
      trigger.kill();
    };
  }, [sectionRef, photoRef, titleGroupRef, coverRef]);
}
