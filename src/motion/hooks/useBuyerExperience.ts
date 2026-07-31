"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "../core/media";
import { subscribeFrame } from "../core/frameTicker";

let pluginRegistered = false;

// clip-path de 8 puntos con un "puente" degenerado en el centro (patrón
// habitual para simular dos regiones independientes con un único
// clip-path): en reposo (leftEdge=rightEdge=50) el puente tiene anchura
// cero y no recorta nada -- el vídeo se ve completo, sin costura, porque
// sigue siendo un único elemento sin dividir. Al crecer el hueco
// (leftEdge->0, rightEdge->100) el centro queda recortado y el vídeo
// "se parte" desde dentro hacia los bordes, revelando lo que hay detrás
// (TestSection) -- un único <video>, nunca dos.
const splitClipPath = (leftEdge: number, rightEdge: number) =>
  `polygon(0% 0%, ${leftEdge}% 0%, ${leftEdge}% 100%, ${rightEdge}% 100%, ${rightEdge}% 0%, 100% 0%, 100% 100%, 0% 100%)`;

const CLIP_CLOSED = splitClipPath(50, 50);
const CLIP_OPEN = splitClipPath(0, 100);

type Refs = {
  sectionRef: React.RefObject<HTMLElement | null>;
  stickyRef: React.RefObject<HTMLDivElement | null>;
  curtainRef: React.RefObject<HTMLDivElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  overlayRef: React.RefObject<HTMLDivElement | null>;
  microRef: React.RefObject<HTMLSpanElement | null>;
  headlineRef: React.RefObject<HTMLHeadingElement | null>;
  ctaRef: React.RefObject<HTMLAnchorElement | null>;
};

/**
 * Escena "comprar" (2026-08-13, telón) + continuidad "apertura por el
 * centro" (2026-08-18, revertida y rehecha aquí -- la versión anterior
 * usaba una capa fullVideo + panelLeft/panelRight con vídeos propios, y
 * el cruce entre capas se veía como un segundo encuadre del vídeo. Ahora
 * hay un ÚNICO <video>, siempre el mismo elemento, del primer frame al
 * último -- nunca se monta ni se cruza con nada. Mientras la escena está
 * cerrada su clip-path no recorta nada (CLIP_CLOSED), así que se ve como
 * un vídeo normal a pantalla completa, sin costura porque no hay
 * división real. Al llegar la fase de apertura, el clip-path anima hacia
 * CLIP_OPEN: se abre un hueco en el centro que crece hacia los dos
 * bordes, revelando TestSection por detrás -- ningún segundo elemento,
 * ningún currentTime, ningún crossfade.
 *
 * Un único timeline, un único ScrollTrigger, cinco fases (posiciones en
 * unidades de timeline, no self.progress directamente -- ver nota de
 * altura en BuyerExperience.module.css):
 *  1. telón sube (sin tocar).
 *  2. texto/CTA + overlay entran (sin tocar).
 *  3. texto/CTA + overlay se desvanecen -- el vídeo queda íntegro y
 *     limpio antes de abrirse.
 *  4. clip-path del vídeo: CLIP_CLOSED -> CLIP_OPEN, revelando TestSection
 *     (capa base, ya colocada, real, por oclusión). Termina en t=1.4.
 *  5. NUEVO (2026-08-19) -- pausa de lectura: tween vacío de duración
 *     holdDuration justo después de que t=1.4 deja TestSection asentada
 *     al 100%. Nada cambia durante el hold -- ni opacity, ni escala, ni
 *     posición -- porque no hay ningún tween activo, solo tiempo/scroll
 *     reservado con la escena sticky (mismo ScrollTrigger, sin pin
 *     nuevo). Después, el scroll vertical se libera con normalidad.
 *
 * Deliberadamente SIN pin:true de GSAP -- contenedor alto (.buyer, altura
 * real en CSS) + escenario position:sticky (.sticky, CSS puro) + un único
 * ScrollTrigger con scrub (sin pin) que expone self.progress 0-1. Mismo
 * patrón estable ya usado en el resto del proyecto.
 *
 * Header: mecanismo genérico de useHeaderState.ts
 * (data-header-tone/data-header-hide) -- estáticos a "dark"/"true" en el
 * JSX (coincide con el estado final, el que se ve bajo
 * prefers-reduced-motion, donde este hook nunca se ejecuta) y corregidos
 * aquí en cuanto el scrub arranca de verdad; recuperado justo antes de
 * que la apertura termine de asentar TestSection.
 *
 * prefers-reduced-motion: sin ScrollTrigger -- vídeo a pantalla completa y
 * texto visibles desde el primer frame, TestSection debajo en flujo
 * normal, resuelto en BuyerExperience.module.css.
 */
export function useBuyerExperience(): Refs {
  const sectionRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const curtainRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const microRef = useRef<HTMLSpanElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const ctaRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const sticky = stickyRef.current;
    const curtain = curtainRef.current;
    const video = videoRef.current;
    const overlay = overlayRef.current;
    const micro = microRef.current;
    const headline = headlineRef.current;
    const cta = ctaRef.current;
    if (!section || !sticky || !curtain || !video || !overlay || !micro || !headline || !cta) {
      return;
    }

    video.play().catch(() => {});

    if (prefersReducedMotion()) return;

    if (!pluginRegistered) {
      gsap.registerPlugin(ScrollTrigger);
      pluginRegistered = true;
    }

    gsap.set(curtain, { yPercent: 0 });
    gsap.set(video, { clipPath: CLIP_CLOSED });
    gsap.set(overlay, { opacity: 0 });
    gsap.set([micro, headline, cta], { opacity: 0, y: 16 });

    // Pausa de lectura tras la apertura -- en unidades de timeline (no
    // self.progress), para que el umbral del header de abajo (t < 1.4)
    // siga siendo válido sin importar cuánto dure el hold ni el
    // breakpoint. Rango pedido: ~60-80vh escritorio, ~35-50vh móvil (ver
    // altura de .buyer en BuyerExperience.module.css). totalDuration se
    // calcula aquí (no con tl.duration() dentro de onUpdate) para no
    // depender de `tl` antes de que termine de asignarse.
    const holdDuration = window.matchMedia("(max-width: 900px)").matches ? 0.19 : 0.32;
    const splitEndTime = 1.4;
    const totalDuration = splitEndTime + holdDuration;

    const tl = gsap.timeline({
      scrollTrigger: {
        // "top bottom" (no "top top"): con .sticky como primer hijo de
        // .buyer sin offset, entre "top bottom" y "top top" hay ya un
        // viewport completo de scroll normal (la sección entrando desde
        // abajo) durante el cual, con "top top", self.progress seguía
        // clavado en 0 -- el telón (opaco) recorría ese tramo entero sin
        // animar: la pantalla blanca casi completa que describen las
        // capturas. Al arrancar el progreso en cuanto la sección empieza a
        // entrar en el viewport, el telón ya está subiendo desde el primer
        // scroll útil, tanto si .sticky todavía se mueve en flujo normal
        // como si ya está fijado (el reveal es relativo entre telón y
        // vídeo, ambos dentro del mismo .sticky -- no depende de si la
        // propia caja está pineada).
        trigger: section,
        start: "top bottom",
        end: "bottom bottom",
        scrub: 0.4,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          // Tiempo real del timeline (no self.progress, que se aplasta o
          // estira según cuánto dure el hold) -- oculto desde que el
          // telón empieza a moverse (t=0.02) hasta que la apertura por
          // el centro termina (t=1.4); a partir de ahí, durante todo el
          // hold, el header se mantiene visible sin más cambios.
          const t = self.progress * totalDuration;
          const shouldHide = t >= 0.02 && t < splitEndTime;
          section.setAttribute("data-header-hide", shouldHide ? "true" : "false");
          if (shouldHide) {
            section.setAttribute("data-header-tone", "dark");
          } else {
            section.removeAttribute("data-header-tone");
          }
        },
      },
    });

    // -- Fase 1 (sin tocar): 0%-2% pausa casi inexistente, 2%-45% el
    // telón sube -- revelación física, sin transparencia.
    tl.to(curtain, { yPercent: -100, duration: 0.43, ease: "none" }, 0.02);
    // -- Fase 2 (sin tocar): telón fuera, vídeo a pantalla completa,
    // entra overlay + contenido.
    tl.to(overlay, { opacity: 1, duration: 0.08, ease: "none" }, 0.46);
    tl.to(micro, { opacity: 1, y: 0, duration: 0.05, ease: "none" }, 0.5);
    tl.to(headline, { opacity: 1, y: 0, duration: 0.07, ease: "none" }, 0.55);
    tl.to(cta, { opacity: 1, y: 0, duration: 0.05, ease: "none" }, 0.63);
    // -- Fase 3 (sin tocar): texto/CTA + overlay se desvanecen -- el
    // vídeo se queda íntegro y limpio antes de abrirse.
    tl.to(overlay, { opacity: 0, duration: 0.1, ease: "none" }, 0.75);
    tl.to([micro, headline, cta], { opacity: 0, y: -10, duration: 0.1, ease: "none" }, 0.75);
    // -- Fase 4 (sin tocar): el mismo vídeo (un único elemento) se abre
    // por el centro vía clip-path, revelando TestSection por oclusión.
    // Termina en splitEndTime (1.4) -- mismo punto y duración que tenía
    // antes la apertura en xPercent.
    tl.to(video, { clipPath: CLIP_OPEN, duration: 0.5, ease: "none" }, 0.9);
    // -- Fase 5 (nueva): pausa de lectura -- tween vacío, no anima nada;
    // solo reserva tiempo/scroll para que TestSection permanezca
    // asentada (sticky, inmóvil) antes de liberar el scroll vertical.
    tl.to({}, { duration: holdDuration }, splitEndTime);

    // start/end dependen de window.innerHeight ("top bottom"/"bottom
    // bottom") -- un resize real cambia esas posiciones.
    const handleResize = () => ScrollTrigger.refresh();
    window.addEventListener("resize", handleResize);

    const unsubscribe = subscribeFrame(() => ScrollTrigger.update());

    return () => {
      unsubscribe();
      window.removeEventListener("resize", handleResize);
      tl.scrollTrigger?.kill();
      tl.kill();
      section.setAttribute("data-header-hide", "true");
      section.setAttribute("data-header-tone", "dark");
    };
  }, []);

  return {
    sectionRef,
    stickyRef,
    curtainRef,
    videoRef,
    overlayRef,
    microRef,
    headlineRef,
    ctaRef,
  };
}
