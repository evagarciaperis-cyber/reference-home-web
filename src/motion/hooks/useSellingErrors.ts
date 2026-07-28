"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "../core/media";
import { subscribeFrame } from "../core/frameTicker";

let pluginRegistered = false;

const MOBILE_QUERY = "(max-width: 640px)";

// Recorrido del pin (2026-07-28): 360% de la altura del viewport, dentro
// del rango 320-400vh pedido -- primer valor razonable, se ajusta después
// según lectura real (comentario explícito del encargo).
const SCROLL_DISTANCE = "+=360%";

// Progreso en el que cada capítulo pasa a ser "el protagonista" (número en
// burdeos) -- coincide con el inicio de su propia entrada. Ver
// SellingErrors.module.css, [data-chapter-active="true"]. Atributo DOM
// plano (no clase de CSS Module): igual que data-panels-ready en
// useMarketingReel.ts, para no tener que importar el CSS Module dentro del
// hook y para no tocar React state en cada frame.
const CHAPTER_ACTIVE_AT = [0.4, 0.5, 0.62, 0.74];

type Refs = {
  sectionRef: React.RefObject<HTMLElement | null>;
  stageRef: React.RefObject<HTMLDivElement | null>;
  labelRef: React.RefObject<HTMLDivElement | null>;
  titleLine1Ref: React.RefObject<HTMLSpanElement | null>;
  titleLine2Ref: React.RefObject<HTMLSpanElement | null>;
  introRef: React.RefObject<HTMLDivElement | null>;
  chapterRefs: React.RefObject<Array<HTMLElement | null>>;
};

/**
 * Sección editorial añadida inmediatamente después de la salida de
 * MarketingReel (2026-07-28) -- arquitectura de referencia: "Why smooth
 * scroll?" de Lenis (título fijo a la izquierda, columna derecha que
 * asciende en secuencia). Fase 1: sin objeto/imagen/WebGL, solo tipografía
 * -- se aprueba narrativa/composición antes de añadir cualquier capa
 * visual.
 *
 * 2026-07-28 (corrección de continuidad): esta sección comparte
 * exactamente el mismo fondo beige/nude que el bloque de los tres vídeos
 * (var(--paper), SellingErrors.module.css .section) -- ya NO existe una
 * cortina verde que sube ni ningún cambio de tono de header. La entrada es
 * puramente tipográfica (opacity + máscaras verticales + translateY), sin
 * cambio de escenario, para que se perciba como el mismo fondo continuando
 * quieto mientras nace el texto encima. Por eso tampoco toca
 * data-header-tone: al no cambiar el fondo, el header debe seguir
 * mostrando exactamente el mismo tono claro/logo rojo que ya trae de
 * MarketingReel -- no hay nada que gestionar aquí.
 *
 * Escritorio: una única escena pinned + timeline scrubbed (mismo patrón
 * que useMarketingReel.ts/useWorkZoom.ts). La etiqueta y el título
 * arrancan casi de inmediato (0.01/0.04/0.07) para no dejar un tramo
 * muerto al empezar el pin. La intro y los cuatro capítulos de la columna
 * derecha NO se han tocado en esta ronda (0.24 en adelante, igual que
 * antes). Sin springs, sin rebote: el "peso" viene de la construcción
 * geométrica (ease:"none", el scrub ya hace de curva).
 *
 * Nota técnica (2026-07-28, intento de solapamiento real descartado): se
 * probó a arrancar el pin de esta escena ANTES de que el de MarketingReel
 * terminase (start numérico, ~12vh antes de la posición natural), para que
 * la etiqueta apareciera literalmente mientras Negociación seguía
 * desvaneciéndose. Medido con precisión (rects de los pin-spacers de GSAP
 * en ambas escenas): el solapamiento real conseguido era 0px -- el spacer
 * de esta sección se sigue insertando en su posición natural en el flujo
 * del documento pase lo que pase con el "start" numérico, así que el pin
 * no llega a activarse antes de tiempo con esta técnica. Revertido: dos
 * ScrollTrigger pinned genuinamente simultáneos exigiría una
 * reestructuración mayor (fuera del alcance de "solo ajusta timing/start/
 * end" de este encargo), así que el margen se ha apurado en el único
 * sitio seguro: el arranque interno de la etiqueta/título, ya al mínimo.
 *
 * Móvil: sin pin -- la columna izquierda es sticky nativo (CSS), los
 * capítulos vuelven al flujo normal y cada uno tiene su propio
 * ScrollTrigger scrubbed y NO pinned (sigue sin haber un segundo RAF: se
 * sincronizan con el mismo frameTicker de abajo).
 *
 * prefers-reduced-motion: no se registra ningún ScrollTrigger -- todo el
 * contenido queda visible y en flujo normal desde el primer frame
 * (SellingErrors.module.css, @media prefers-reduced-motion).
 */
export function useSellingErrors(chapterCount: number): Refs {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const titleLine1Ref = useRef<HTMLSpanElement>(null);
  const titleLine2Ref = useRef<HTMLSpanElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const chapterRefs = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const label = labelRef.current;
    const titleLine1 = titleLine1Ref.current;
    const titleLine2 = titleLine2Ref.current;
    const intro = introRef.current;
    const chapters = chapterRefs.current.slice(0, chapterCount);
    if (!section || !stage || !label || !titleLine1 || !titleLine2 || !intro || chapters.some((c) => !c) || chapters.length !== chapterCount) {
      return;
    }
    const chapterEls = chapters as HTMLElement[];

    if (prefersReducedMotion()) {
      // Todo el layout/estado visible ya lo resuelve el CSS de
      // @media (prefers-reduced-motion: reduce) -- sin pin, contenido
      // accesible en flujo normal desde el primer frame.
      return;
    }

    if (!pluginRegistered) {
      gsap.registerPlugin(ScrollTrigger);
      pluginRegistered = true;
    }

    const isMobile = window.matchMedia(MOBILE_QUERY).matches;

    if (isMobile) {
      // Móvil: sin pin, revelo individual simple por elemento -- todavía
      // GSAP + ScrollTrigger (nunca una animación autónoma ni un RAF
      // propio), pero cada trigger es independiente y no pinned, tal como
      // pide el encargo ("sin pin extenso", "sin efectos complejos").
      const revealTargets = [label, titleLine1, titleLine2, intro, ...chapterEls];
      const triggers = revealTargets.map((el) => {
        gsap.set(el, { opacity: 0, y: 24 });
        return ScrollTrigger.create({
          trigger: el,
          start: "top 88%",
          end: "top 60%",
          scrub: 0.3,
          onUpdate: (self) => {
            gsap.set(el, { opacity: self.progress, y: 24 * (1 - self.progress) });
          },
        });
      });

      const unsubscribeMobile = subscribeFrame(() => ScrollTrigger.update());
      return () => {
        unsubscribeMobile();
        triggers.forEach((t) => t.kill());
      };
    }

    // ---- Escritorio: escena pinned + timeline scrubbed única ----
    gsap.set(label, { opacity: 0, y: 16 });
    gsap.set([titleLine1, titleLine2], { opacity: 0, y: 36 });
    gsap.set(intro, { opacity: 0, y: 40, scale: 1 });
    chapterEls.forEach((c) => gsap.set(c, { opacity: 0, y: 40, scale: 1 }));

    let activeIndex = -1;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: stage,
        start: "top top",
        end: SCROLL_DISTANCE,
        scrub: 0.4,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const p = self.progress;

          let nextActive = -1;
          for (let i = CHAPTER_ACTIVE_AT.length - 1; i >= 0; i--) {
            if (p >= CHAPTER_ACTIVE_AT[i]) {
              nextActive = i;
              break;
            }
          }
          if (nextActive !== activeIndex) {
            if (activeIndex >= 0) chapterEls[activeIndex]?.removeAttribute("data-chapter-active");
            if (nextActive >= 0) chapterEls[nextActive]?.setAttribute("data-chapter-active", "true");
            activeIndex = nextActive;
          }
        },
      },
    });

    // 0.01 -> 0.08: etiqueta + línea -- arranca prácticamente al
    // instante del pin, sin ningún tramo muerto al principio.
    tl.to(label, { opacity: 1, y: 0, duration: 0.07, ease: "none" }, 0.01)
      // 0.03 -> 0.11: reveal del título por líneas enmascaradas, pequeño
      // desfase entre ambas (wrapper overflow:hidden en CSS + y/opacity
      // aquí -- nunca el word-reveal del Manifesto).
      .to(titleLine1, { opacity: 1, y: 0, duration: 0.06, ease: "none" }, 0.03)
      .to(titleLine2, { opacity: 1, y: 0, duration: 0.06, ease: "none" }, 0.05)
      // 0.10 -> 0.20: entra el texto introductorio derecho -- "casi al
      // mismo tiempo" que el título (antes 0.24, esperaba a que el
      // título terminase del todo). Se asienta y aguanta ahí (0.20-0.40)
      // hasta que empieza a ascender exactamente en el mismo punto de
      // siempre (0.40) -- eso NO se ha tocado, igual que el resto de la
      // columna derecha a partir de ahí.
      .to(intro, { opacity: 1, y: 0, duration: 0.1, ease: "none" }, 0.1)
      // 0.40 -> 0.50: la intro asciende y se desvanece; entra el capítulo 01.
      .to(intro, { opacity: 0, y: -40, scale: 0.97, duration: 0.1, ease: "none" }, 0.4)
      .to(chapterEls[0], { opacity: 1, y: 0, duration: 0.1, ease: "none" }, 0.4)
      // 0.50 -> 0.62: 01 asciende; entra 02.
      .to(chapterEls[0], { opacity: 0, y: -40, scale: 0.97, duration: 0.12, ease: "none" }, 0.5)
      .to(chapterEls[1], { opacity: 1, y: 0, duration: 0.12, ease: "none" }, 0.5)
      // 0.62 -> 0.74: 02 asciende; entra 03.
      .to(chapterEls[1], { opacity: 0, y: -40, scale: 0.97, duration: 0.12, ease: "none" }, 0.62)
      .to(chapterEls[2], { opacity: 1, y: 0, duration: 0.12, ease: "none" }, 0.62)
      // 0.74 -> 0.86: 03 asciende; entra 04.
      .to(chapterEls[2], { opacity: 0, y: -40, scale: 0.97, duration: 0.12, ease: "none" }, 0.74)
      .to(chapterEls[3], { opacity: 1, y: 0, duration: 0.12, ease: "none" }, 0.74);
    // 0.86 -> 1.00: el capítulo 04 permanece -- sin tween adicional, se
    // queda en su estado activo hasta que el pin se libera.

    const unsubscribe = subscribeFrame(() => ScrollTrigger.update());

    return () => {
      unsubscribe();
      tl.scrollTrigger?.kill();
      tl.kill();
      chapterEls.forEach((c) => c.removeAttribute("data-chapter-active"));
    };
  }, [chapterCount]);

  return { sectionRef, stageRef, labelRef, titleLine1Ref, titleLine2Ref, introRef, chapterRefs };
}
