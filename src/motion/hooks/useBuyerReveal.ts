"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "../core/media";
import { subscribeFrame } from "../core/frameTicker";

let pluginRegistered = false;

type Refs = {
  sectionRef: React.RefObject<HTMLElement | null>;
  stickyRef: React.RefObject<HTMLDivElement | null>;
  panelLeftRef: React.RefObject<HTMLDivElement | null>;
  panelRightRef: React.RefObject<HTMLDivElement | null>;
  videoLeftRef: React.RefObject<HTMLVideoElement | null>;
  videoRightRef: React.RefObject<HTMLVideoElement | null>;
  overlayRef: React.RefObject<HTMLDivElement | null>;
  microRef: React.RefObject<HTMLSpanElement | null>;
  headlineRef: React.RefObject<HTMLHeadingElement | null>;
  ctaRef: React.RefObject<HTMLAnchorElement | null>;
};

/**
 * Escena "apertura en dos cortinas" (2026-08-15) -- continúa el estado
 * final de BuyerExperience (mismo vídeo, mismo texto/CTA, sin tocar ese
 * componente) y lo abre como dos puertas hacia los laterales, revelando
 * TestSection -- ya colocado, real, en flujo, DEBAJO de las cortinas
 * dentro de este mismo escenario -- por pura oclusión, nunca por una
 * animación propia de TestSection.
 *
 * Un único vídeo lógico, dos ventanas: .panelLeft/.panelRight son
 * contenedores overflow:hidden de 50%+2px (solape real, evita costura de
 * subpíxel) que recortan cada uno una mitad EXACTA del mismo encuadre --
 * cada video interior mide 100vw y se desplaza con `left` en vw (unidad
 * de viewport, no relativa al panel) para que ambos queden alineados al
 * mismo origen de pantalla, así que lo único que puede desincronizarlos
 * es el tiempo de reproducción, no la posición. Se igualan explícitamente
 * (mismo `currentTime`, arrancados en el mismo `play()`) para que no haya
 * diferencia perceptible entre ambos lados durante la breve apertura.
 * Las cortinas se desplazan como bloque (xPercent) -- el vídeo interior
 * nunca se mueve por separado, así que viaja "pegado" a su ventana.
 *
 * Deliberadamente SIN pin:true -- contenedor alto + sticky + un único
 * ScrollTrigger scrub, mismo patrón ya estable en el resto del proyecto.
 *
 * Header: mismo mecanismo genérico (data-header-tone/data-header-hide)
 * que el resto de la home -- oculto durante vídeo+apertura, recuperado en
 * cuanto TestSection queda totalmente visible.
 *
 * prefers-reduced-motion: sin ScrollTrigger -- cortinas ya fuera,
 * TestSection visible desde el primer frame (CSS).
 */
export function useBuyerReveal(): Refs {
  const sectionRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const panelLeftRef = useRef<HTMLDivElement>(null);
  const panelRightRef = useRef<HTMLDivElement>(null);
  const videoLeftRef = useRef<HTMLVideoElement>(null);
  const videoRightRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const microRef = useRef<HTMLSpanElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const ctaRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const sticky = stickyRef.current;
    const panelLeft = panelLeftRef.current;
    const panelRight = panelRightRef.current;
    const videoLeft = videoLeftRef.current;
    const videoRight = videoRightRef.current;
    const overlay = overlayRef.current;
    const micro = microRef.current;
    const headline = headlineRef.current;
    const cta = ctaRef.current;
    if (
      !section ||
      !sticky ||
      !panelLeft ||
      !panelRight ||
      !videoLeft ||
      !videoRight ||
      !overlay ||
      !micro ||
      !headline ||
      !cta
    ) {
      return;
    }

    // Arranque simultáneo -- lo más cerca posible de currentTime=0 en
    // ambos a la vez, para que la apertura no muestre un frame distinto
    // en cada mitad.
    videoLeft.currentTime = 0;
    videoRight.currentTime = 0;
    Promise.all([videoLeft.play(), videoRight.play()]).catch(() => {});

    if (prefersReducedMotion()) return;

    if (!pluginRegistered) {
      gsap.registerPlugin(ScrollTrigger);
      pluginRegistered = true;
    }

    gsap.set([panelLeft, panelRight], { xPercent: 0 });
    gsap.set(overlay, { opacity: 1 });
    gsap.set([micro, headline, cta], { opacity: 1, y: 0 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.4,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          // Oculto durante vídeo + apertura; recuperado en cuanto
          // TestSection queda totalmente visible y asentada (justo
          // después de que las cortinas terminen de salir, 82%).
          const shouldHide = self.progress < 0.85;
          section.setAttribute("data-header-hide", shouldHide ? "true" : "false");
          if (shouldHide) {
            section.setAttribute("data-header-tone", "dark");
          } else {
            section.removeAttribute("data-header-tone");
          }
        },
      },
    });

    // 0%-18%: vídeo fullscreen completo, texto/CTA asentados -- continúa
    // tal cual el estado final de BuyerExperience, sin tween.
    // 18%-30%: texto/CTA (y el overlay que los hace legibles) se
    // desvanecen -- el vídeo se queda íntegro y limpio antes de abrirse.
    tl.to([micro, headline, cta], { opacity: 0, y: -10, duration: 0.12, ease: "none" }, 0.18);
    tl.to(overlay, { opacity: 0, duration: 0.12, ease: "none" }, 0.18);
    // 30%-82%: las dos cortinas se abren en simetría perfecta -- mismo
    // ancho, mismo punto de partida, misma duración.
    tl.to(panelLeft, { xPercent: -100, duration: 0.52, ease: "none" }, 0.3);
    tl.to(panelRight, { xPercent: 100, duration: 0.52, ease: "none" }, 0.3);
    // 82%-100%: TestSection totalmente visible -- pausa antes de liberar,
    // sin más animación (TestSection no reacciona, se queda como está).

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
    panelLeftRef,
    panelRightRef,
    videoLeftRef,
    videoRightRef,
    overlayRef,
    microRef,
    headlineRef,
    ctaRef,
  };
}
