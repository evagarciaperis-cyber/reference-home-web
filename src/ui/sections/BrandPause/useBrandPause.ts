"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "@/motion/core/media";
import { subscribeFrame } from "@/motion/core/frameTicker";

let pluginRegistered = false;

const MOBILE_QUERY = "(max-width: 640px)";
// 2026-07-30: mismo umbral que useHorizontalHandoff.ts -- a partir de aquí
// BrandPause vive dentro de la escena horizontal (HorizontalHandoff), no
// en flujo vertical normal. Su propio ScrollTrigger "top bottom"->"top
// top" asume que BrandPause se mueve VERTICALMENTE con el scroll nativo;
// dentro de la escena horizontal, el wrapper está pinneado (position:fixed)
// y BrandPause solo se desplaza en horizontal, así que ese trigger dejaría
// de tener sentido geométrico. El desplazamiento horizontal pasa a ser el
// mecanismo de entrada -- el texto se asienta directamente.
const WIDE_DESKTOP_QUERY = "(min-width: 1024px)";

/**
 * Pausa de marca (2026-07-30, composición centrada) entre SellingErrors y
 * ProjectsGallery -- campo verde corporativo sólido + titular monumental +
 * etiqueta editorial, sobre la filigrana decorativa de fondo (única capa
 * decorativa; el gesto caligráfico SVG de rondas anteriores se retiró por
 * completo, ver BrandPause.tsx/BrandPause.module.css). Vive junto a
 * BrandPause.tsx (no en src/motion/hooks/, a diferencia del resto de hooks
 * de animación del proyecto) porque así lo pide expresamente el encargo --
 * solo existe porque hay animación real que lo justifica (el reveal por
 * scroll), nada más.
 *
 * Deliberadamente SIN pin. Lección directa de rondas anteriores en
 * MarketingReel/SellingErrors: un ScrollTrigger `pin:true` reserva por
 * defecto espacio extra tras liberarse y ese sobrante generó tanto tramos
 * muertos como disputas de z-index con la sección siguiente, hasta
 * corregirlo a mano con margin-bottom/z-index. Aquí, en cambio, el reveal es
 * un único ScrollTrigger NO pinned (sin spacer) dentro de un bloque
 * simplemente alto (svh en CSS): el titular se revela mientras el usuario
 * atraviesa ese bloque con scroll normal, y el fondo verde aparece por flujo
 * de documento normal -- nunca por una capa fixed que pudiera tapar los
 * capítulos de SellingErrors mientras siguen saliendo. Sin pin no hay
 * spacer, así que tampoco hay nada que auditar ahí.
 *
 * Header: la sección se marca data-header-hide="true" además de
 * data-header-tone="dark" (BrandPause.tsx) -- mismo mecanismo genérico y
 * decoupled que el tono (useHeaderState.ts), reutilizado tal cual, sin
 * lógica nueva aquí. El header sale/entra solo, en cuanto el punto de
 * muestreo del hook queda cubierto/descubierto por esta sección -- reversible
 * al hacer scroll inverso, sin flicker, sin segundo header.
 *
 * Móvil: mismo mecanismo (ScrollTrigger no pinned), recorrido más corto,
 * segmentos propios (BrandPause.tsx, refs `m*`) -- no una compresión de la
 * composición de escritorio. La etiqueta se comparte entre ambas rutas
 * (solo cambia su tamaño/posición por CSS).
 *
 * prefers-reduced-motion: sin ScrollTrigger -- toda la composición queda
 * visible desde el primer frame (BrandPause.module.css ya lo resuelve por
 * CSS puro).
 */
export function useBrandPause() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  // Escritorio -- "La diferencia está" / "en" / "cómo" / "se hace."
  const line1Ref = useRef<HTMLSpanElement>(null);
  const enRef = useRef<HTMLSpanElement>(null);
  const comoRef = useRef<HTMLSpanElement>(null);
  const seHaceRef = useRef<HTMLSpanElement>(null);

  // Móvil -- mismos cuatro segmentos, repartidos en tres líneas en vez de
  // dos.
  const mLine1Ref = useRef<HTMLSpanElement>(null);
  const mEnRef = useRef<HTMLSpanElement>(null);
  const mComoRef = useRef<HTMLSpanElement>(null);
  const mLine3Ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const label = labelRef.current;
    if (!stage || !label) return;

    const isMobile = window.matchMedia(MOBILE_QUERY).matches;
    const desktopEls = [line1Ref.current, enRef.current, comoRef.current, seHaceRef.current];
    const mobileEls = [mLine1Ref.current, mEnRef.current, mComoRef.current, mLine3Ref.current];
    const targets = isMobile ? mobileEls : desktopEls;
    if (targets.some((el) => !el)) return;
    const els = targets as HTMLElement[];

    if (prefersReducedMotion()) {
      gsap.set([label, ...els], { opacity: 1, y: 0 });
      return;
    }

    if (window.matchMedia(WIDE_DESKTOP_QUERY).matches) {
      // Dentro de HorizontalHandoff: el desplazamiento del track es el
      // reveal -- se asienta directo, sin ScrollTrigger propio.
      gsap.set([label, ...els], { opacity: 1, y: 0 });
      return;
    }

    if (!pluginRegistered) {
      gsap.registerPlugin(ScrollTrigger);
      pluginRegistered = true;
    }

    // y en píxeles, no yPercent (lección de la ronda anterior): con yPercent,
    // el transform de CSS en % que servía de base FOUC entraba en conflicto
    // con el tracking interno de GSAP -- la opacity llegaba a 1 pero el
    // translateY se quedaba clavado en el valor inicial. Menor en móvil, a
    // juego con la escala tipográfica más pequeña -- mismos valores que el
    // transform de base en BrandPause.module.css (.segment / móvil).
    const revealOffset = isMobile ? 60 : 110;
    gsap.set(els, { opacity: 0, y: revealOffset });
    gsap.set(label, { opacity: 0, y: 24 });

    const [seg1, seg2, seg3, seg4] = els;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: stage,
        start: "top bottom",
        // Móvil: recorrido más corto -- el reveal se completa mucho antes
        // de que la sección llegue a ocupar todo el viewport, en vez de
        // esperar a "top top" como en escritorio.
        end: isMobile ? "top 40%" : "top top",
        scrub: 0.4,
      },
    });

    // 1. etiqueta editorial ("02 -- Proceso creativo").
    tl.to(label, { opacity: 1, y: 0, duration: 0.14, ease: "none" }, 0.04)
      // 2. "La diferencia está".
      .to(seg1, { opacity: 1, y: 0, duration: 0.26, ease: "none" }, 0.2)
      // 3. "en".
      .to(seg2, { opacity: 1, y: 0, duration: 0.16, ease: "none" }, 0.4)
      // 4. "cómo" -- desfase ligeramente más marcado, el gesto tipográfico
      // principal se hace notar por separado del resto de la frase.
      .to(seg3, { opacity: 1, y: 0, duration: 0.2, ease: "none" }, 0.48)
      // 5. "se hace.".
      .to(seg4, { opacity: 1, y: 0, duration: 0.16, ease: "none" }, 0.6);
    // 6-7. El resto del recorrido (hasta progreso 1) es la composición ya
    // asentada + la breve permanencia pedida, sin más animación, antes de
    // que ProjectsGallery empiece inmediatamente después en flujo normal.

    const unsubscribe = subscribeFrame(() => ScrollTrigger.update());

    return () => {
      unsubscribe();
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, []);

  return {
    sectionRef,
    stageRef,
    labelRef,
    line1Ref,
    enRef,
    comoRef,
    seHaceRef,
    mLine1Ref,
    mEnRef,
    mComoRef,
    mLine3Ref,
  };
}
