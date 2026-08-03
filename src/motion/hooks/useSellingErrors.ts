"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion, MOBILE_QUERY, WIDE_DESKTOP_QUERY } from "../core/media";
import { subscribeFrame } from "../core/frameTicker";

let pluginRegistered = false;

// 2026-07-30 (transición horizontal a BrandPause): mismo umbral que
// useBrandPause.ts -- por debajo de este ancho, BrandPause sigue en flujo
// vertical normal después de SellingErrors, sin desplazamiento horizontal.

// Base histórica calibrada a mano en rondas anteriores (480% para
// entrada+permanencia+salida de etiqueta/título/intro/4 capítulos, sin
// vuelta a intro ni handoff). Esta ronda añade dos fases nuevas al final
// (vuelta a la intro, y el desplazamiento horizontal) sin tocar el ritmo
// ya aprobado de los capítulos -- para lograrlo, SCROLL_DISTANCE_PERCENT
// se recalcula más abajo escalando este valor exactamente en la misma
// proporción en que crece la duración local total del timeline, así el
// ratio píxeles-de-scroll por unidad de tiempo local se mantiene idéntico
// para TODO el tramo ya existente (00-0.4-capítulos), y las fases nuevas
// solo consumen el sobrante genuinamente nuevo.
const BASE_SCROLL_DISTANCE_PERCENT = 480;
// Duración del handoff horizontal, como fracción de "SellingErrors ya
// asentado en su estado introductorio" (T_SETTLED más abajo) -- una
// escena deliberadamente generosa, no apresurada.
const HANDOFF_DURATION_FRACTION = 0.4;
// A partir de qué fracción del propio handoff (0-1, no del timeline
// completo) se considera BrandPause "presente" y el header debe quedar
// oculto -- reversible, recalculado cada frame.
const HEADER_HIDE_AT_HANDOFF_FRACTION = 0.6;

// Solapamiento real con la cola de MarketingReel (2026-07-28, corrección
// de continuidad nº3). 160px (~16vh a 1000px de alto) -- ver "capa eco"
// más abajo: es la ÚNICA técnica que consigue overlap real (comprobado
// que desplazar el "start" del pin, con función numérica o con sintaxis
// relativa "top-=Npx top", da 0px de solapamiento real -- el pin-spacer
// de GSAP siempre se inserta en la posición natural del elemento en el
// flujo, sea cual sea su "start").
const ECHO_OVERLAP_PX = 160;

// Ritmo de cada capítulo (2026-07-29, corrección de solapamiento): cada
// uno es una unidad secuencial completa -- entra, se asienta durante una
// pausa de lectura real (la fase más larga, con diferencia), sale, y solo
// cuando ha terminado casi del todo empieza a entrar el siguiente. Nunca
// dos legibles a la vez. Proporciones pedidas: entrada 18%, permanencia
// 54%, salida 20% (el 8% de "transición limpia" restante es justo el
// margen que separa "el siguiente empieza al 90% de la salida del
// anterior" de "empieza al 100%" -- ver NEXT_STARTS_AT_EXIT_FRACTION).
const CHAPTERS_START = 0.4; // el resto de la sección (etiqueta/título/intro) no se toca
const CH_ENTRY_FRAC = 0.18;
const CH_HOLD_FRAC = 0.54;
const CH_EXIT_FRAC = 0.2;
// El siguiente capítulo empieza cuando el anterior lleva un 90% de su
// propia salida -- ese 10% final es el único solapamiento permitido, y
// ocurre con ambos casi invisibles (opacity muy baja), nunca dos títulos
// a plena opacidad a la vez.
const NEXT_STARTS_AT_EXIT_FRACTION = 0.9;

type Refs = {
  sectionRef: React.RefObject<HTMLElement | null>;
  stageRef: React.RefObject<HTMLDivElement | null>;
  labelRef: React.RefObject<HTMLDivElement | null>;
  titleLine1Ref: React.RefObject<HTMLSpanElement | null>;
  titleLine2Ref: React.RefObject<HTMLSpanElement | null>;
  introRef: React.RefObject<HTMLDivElement | null>;
  chapterRefs: React.RefObject<Array<HTMLElement | null>>;
  earlyRevealRef: React.RefObject<HTMLDivElement | null>;
  earlyLabelRef: React.RefObject<HTMLDivElement | null>;
  earlyTitleLine1Ref: React.RefObject<HTMLSpanElement | null>;
  earlyTitleLine2Ref: React.RefObject<HTMLSpanElement | null>;
};

/**
 * Sección editorial añadida inmediatamente después de la salida de
 * MarketingReel (2026-07-28) -- arquitectura de referencia: "Why smooth
 * scroll?" de Lenis (título fijo a la izquierda, columna derecha que
 * asciende en secuencia). Fase 1: sin objeto/imagen/WebGL, solo tipografía
 * -- se aprueba narrativa/composición antes de añadir cualquier capa
 * visual.
 *
 * Comparte exactamente el mismo fondo beige/nude que el bloque de los tres
 * vídeos (var(--paper), SellingErrors.module.css .section) -- sin cortina
 * ni cambio de tono de header: al no cambiar el fondo, el header sigue
 * mostrando lo que ya trae de MarketingReel.
 *
 * SOLAPAMIENTO REAL (2026-07-28, corrección de continuidad nº3): la
 * etiqueta y el título deben aparecer MIENTRAS el último vídeo de
 * MarketingReel todavía es visible, no después de que su pin se libere.
 * Un ScrollTrigger con pin:true JAMÁS puede activarse antes de que el pin
 * anterior libere su espacio (comprobado empíricamente: el pin-spacer
 * siempre se inserta en la posición natural del trigger en el documento,
 * sin importar qué "start" se le dé). La solución real es una "capa eco"
 * (SellingErrors.module.css .earlyReveal): un duplicado visual de la
 * etiqueta + título, en position:fixed, FUERA de .stage, revelado por una
 * SEGUNDA ScrollTrigger -- esta sí, sin pin, sin spacer -- cuyo
 * start/end son posiciones de scroll absolutas dentro de los últimos
 * ECHO_OVERLAP_PX de MarketingReel. Cuando el pin real de esta sección se
 * activa (siempre en "top top", sin tocar), la capa eco ya ha llegado a
 * su estado final (mismas clases, mismo texto, misma posición) y el
 * contenido real ya nace visible -- el relevo es imperceptible. Ninguna
 * de las dos ScrollTrigger usa RAF propio: ambas se sincronizan con el
 * mismo frameTicker de siempre.
 *
 * RITMO DE LOS CAPÍTULOS (2026-07-29, corrección de solapamiento): antes,
 * cada capítulo entraba EXACTAMENTE en la misma ventana en que el
 * anterior salía (crossfade puro, mismo `duration`/posición para ambos
 * tweens) -- eso significaba que durante buena parte del recorrido había
 * DOS números/títulos/párrafos parcialmente visibles a la vez. Ahora cada
 * capítulo es una unidad secuencial completa (entra -> se asienta ->
 * sale -> el siguiente entra al 90% de esa salida, nunca antes) con
 * `visibility` reforzando la `opacity` para que un capítulo inactivo no
 * deje ningún residuo. La intro también acorta su propia salida para no
 * quedarse visible durante el asentamiento del capítulo 01 -- mismo
 * principio, aplicado a la única transición de la columna derecha que no
 * es "un capítulo" pero comparte el mismo riesgo de solape.
 *
 * Móvil: sin pin -- la columna izquierda es sticky nativo (CSS), los
 * capítulos vuelven al flujo normal y cada uno tiene su propio
 * ScrollTrigger scrubbed y NO pinned. Sin capa eco: no hay pin previo del
 * que solaparse en ese layout. Sin el mismo riesgo de doble-visibilidad:
 * en flujo normal cada uno se revela por turnos según el scroll natural,
 * nunca dos ocupando el mismo espacio a la vez.
 *
 * prefers-reduced-motion: no se registra ningún ScrollTrigger -- todo el
 * contenido queda visible y en flujo normal desde el primer frame
 * (SellingErrors.module.css, @media prefers-reduced-motion). La capa eco
 * ni se crea.
 *
 * VUELTA A LA INTRO + HANDOFF HORIZONTAL (2026-07-30): ahora el capítulo
 * 04 también sale (antes se quedaba fijo hasta liberar el pin), y justo
 * después la intro vuelve a entrar -- el MISMO bloque real (izquierda +
 * columna derecha) queda así en su composición introductoria final, sin
 * ningún capítulo superpuesto. Ese estado es el primer "panel" de la
 * transición hacia BrandPause: en vez de duplicar contenido, se extiende
 * el MISMO ScrollTrigger/pin de siempre (trigger: .stage) con una fase
 * final que desliza .stage (xPercent 0->-100) mientras la sección REAL de
 * BrandPause (localizada por selector, sin tocar sus archivos) se desliza
 * en sincronía desde xPercent:100 a 0 -- un único pin, sin echo layers, sin
 * timelines independientes. Solo >=1024px (WIDE_DESKTOP_QUERY, mismo
 * umbral que useBrandPause.ts, que neutraliza su propio reveal por scroll
 * en ese rango porque el desplazamiento pasa a ser la entrada). Por debajo
 * de 1024px la vuelta a la intro ocurre igual, pero sin el handoff --
 * BrandPause sigue justo después en flujo vertical normal.
 */
export function useSellingErrors(chapterCount: number): Refs {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const titleLine1Ref = useRef<HTMLSpanElement>(null);
  const titleLine2Ref = useRef<HTMLSpanElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const chapterRefs = useRef<Array<HTMLElement | null>>([]);
  const earlyRevealRef = useRef<HTMLDivElement>(null);
  const earlyLabelRef = useRef<HTMLDivElement>(null);
  const earlyTitleLine1Ref = useRef<HTMLSpanElement>(null);
  const earlyTitleLine2Ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const label = labelRef.current;
    const titleLine1 = titleLine1Ref.current;
    const titleLine2 = titleLine2Ref.current;
    const intro = introRef.current;
    const chapters = chapterRefs.current.slice(0, chapterCount);
    const earlyReveal = earlyRevealRef.current;
    const earlyLabel = earlyLabelRef.current;
    const earlyTitleLine1 = earlyTitleLine1Ref.current;
    const earlyTitleLine2 = earlyTitleLine2Ref.current;
    if (
      !section ||
      !stage ||
      !label ||
      !titleLine1 ||
      !titleLine2 ||
      !intro ||
      chapters.some((c) => !c) ||
      chapters.length !== chapterCount ||
      !earlyReveal ||
      !earlyLabel ||
      !earlyTitleLine1 ||
      !earlyTitleLine2
    ) {
      return;
    }
    const chapterEls = chapters as HTMLElement[];

    if (prefersReducedMotion()) {
      // Todo el layout/estado visible ya lo resuelve el CSS de
      // @media (prefers-reduced-motion: reduce) -- sin pin, contenido
      // accesible en flujo normal desde el primer frame. La capa eco
      // (position:fixed) se queda oculta -- no hace falta aquí.
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
      // pide el encargo ("sin pin extenso", "sin efectos complejos"). Sin
      // capa eco: aquí no hay ningún pin previo del que solaparse.
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

    // ---- Escritorio ----

    const isWideDesktop = window.matchMedia(WIDE_DESKTOP_QUERY).matches;
    // Localizado por selector (mismo mecanismo genérico y decoupled que
    // data-header-tone/data-header-hide, useHeaderState.ts) -- nunca se
    // toca BrandPause.tsx/module.css/hook para esto. Es la sección REAL,
    // única en el DOM, la misma que usa BrandPause en flujo normal cuando
    // no hay handoff (móvil, tablet, reduced-motion).
    const brandPauseSection = isWideDesktop
      ? document.querySelector<HTMLElement>('[data-header-tone="dark"][data-header-hide]')
      : null;

    // Capa eco: revela etiqueta + título MIENTRAS el pin de MarketingReel
    // sigue activo, usando posiciones de scroll absolutas (no pinned, sin
    // spacer -- por eso SÍ puede caer dentro del rango de otro pin). El
    // punto de referencia es la posición natural de .stage medida ANTES
    // de que exista scroll (mismo momento en que React monta ambos
    // hooks): fiable para comparar contra scrollY porque no depende de
    // ningún spacer, solo de dónde caería .stage en el documento.
    const naturalStart = () => {
      const rect = stage.getBoundingClientRect();
      return rect.top + window.scrollY;
    };

    gsap.set(earlyLabel, { opacity: 0, y: 16 });
    gsap.set([earlyTitleLine1, earlyTitleLine2], { opacity: 0, y: 36 });

    const echoTrigger = ScrollTrigger.create({
      start: () => naturalStart() - ECHO_OVERLAP_PX,
      end: () => naturalStart(),
      scrub: 0.3,
      onUpdate: (self) => {
        const p = self.progress;
        // Aprox. 55%-65% / 70%-75% / cola final de la salida del último
        // vídeo -- ver nota de la función arriba para la conversión a
        // fracciones locales de esta ventana de ECHO_OVERLAP_PX.
        const labelP = gsap.utils.clamp(0, 1, (p - 0.35) / 0.2);
        const line1P = gsap.utils.clamp(0, 1, (p - 0.5) / 0.2);
        const line2P = gsap.utils.clamp(0, 1, (p - 0.75) / 0.2);
        gsap.set(earlyLabel, { opacity: labelP, y: 16 * (1 - labelP) });
        gsap.set(earlyTitleLine1, { opacity: line1P, y: 36 * (1 - line1P) });
        gsap.set(earlyTitleLine2, { opacity: line2P, y: 36 * (1 - line2P) });
      },
      onLeave: () => gsap.set(earlyReveal, { visibility: "hidden" }),
      onEnterBack: () => gsap.set(earlyReveal, { visibility: "visible" }),
      onEnter: () => gsap.set(earlyReveal, { visibility: "visible" }),
      onLeaveBack: () => gsap.set(earlyReveal, { visibility: "hidden" }),
    });

    // El contenido REAL (dentro de .stage) empieza oculto -- IMPORTANTE:
    // no basta con opacity:0 desde un tl.set() en la posición 0. .stage,
    // antes de pinnearse, sigue en position:relative y por flujo normal
    // del documento se vuelve visible unos px antes de que ScrollTrigger
    // lo pinnee de verdad (comprobado: ~80-90px). Un tl.set(...,0) queda
    // "alcanzado" en cuanto el progreso del scrub llega a 0 -- y ese
    // progreso ya está clamped a 0 (no "sin empezar") durante ese mismo
    // tramo, así que se aplicaba antes de tiempo. La única señal fiable
    // de "el pin está realmente activo" es self.isActive del propio
    // ScrollTrigger (onToggle más abajo) -- por eso, además de opacity,
    // estos tres arrancan en visibility:hidden y solo pasan a visible
    // cuando isActive se vuelve true de verdad.
    gsap.set(label, { opacity: 0, y: 16, visibility: "hidden" });
    gsap.set([titleLine1, titleLine2], { opacity: 0, y: 36, visibility: "hidden" });
    gsap.set(intro, { opacity: 0, y: 40, scale: 1 });
    chapterEls.forEach((c) => gsap.set(c, { opacity: 0, y: 40, scale: 1, visibility: "hidden" }));
    gsap.set(stage, { xPercent: 0 });
    if (brandPauseSection) gsap.set(brandPauseSection, { xPercent: -100 });

    // Ritmo de capítulos sin tocar (18%/54%/20% de cada hueco, 90% de
    // solapamiento en la salida) -- se precalcula ANTES de crear el
    // ScrollTrigger porque su duración local total determina, más abajo,
    // cuánto hay que escalar SCROLL_DISTANCE_PERCENT para no alterar el
    // ritmo ya aprobado.
    const chaptersRange = 1 - CHAPTERS_START;
    const chSlot = chaptersRange / chapterCount;
    const entryDuration = chSlot * CH_ENTRY_FRAC;
    const holdDuration = chSlot * CH_HOLD_FRAC;
    const exitDuration = chSlot * CH_EXIT_FRAC;
    const introExitDuration = entryDuration;

    type ChapterTiming = { entryStart: number; holdEnd: number; exitEnd: number };
    const chapterTimings: ChapterTiming[] = [];
    let cursor = CHAPTERS_START;
    for (let i = 0; i < chapterCount; i++) {
      const entryStart = cursor;
      const holdEnd = entryStart + entryDuration + holdDuration;
      const exitEnd = holdEnd + exitDuration;
      chapterTimings.push({ entryStart, holdEnd, exitEnd });
      cursor = holdEnd + exitDuration * NEXT_STARTS_AT_EXIT_FRACTION;
    }

    // 2026-07-30: el capítulo 04 ahora también sale (antes se quedaba fijo
    // hasta el final) y justo después la intro vuelve a entrar -- mismo
    // bloque real, en su composición introductoria final, sin ningún
    // capítulo superpuesto.
    const introReturnStart = cursor;
    const introReturnDuration = entryDuration;
    const T_SETTLED = introReturnStart + introReturnDuration;

    const HANDOFF_DURATION = isWideDesktop && brandPauseSection ? T_SETTLED * HANDOFF_DURATION_FRACTION : 0;
    const T_FINAL = T_SETTLED + HANDOFF_DURATION;

    // Referencia histórica (capítulo 04 sin salida, sin vuelta a intro):
    // la duración local que BASE_SCROLL_DISTANCE_PERCENT=480% calibraba a
    // mano en rondas anteriores. Escalar SCROLL_DISTANCE_PERCENT por
    // exactamente el mismo factor que crece la duración local total
    // preserva el ratio píxeles-de-scroll/tiempo-local para TODO el tramo
    // ya aprobado (etiqueta/título/intro/4 capítulos) -- las fases nuevas
    // (vuelta a intro + handoff) solo consumen el sobrante genuinamente
    // nuevo, nunca comprimen ni alargan lo existente.
    const advance = entryDuration + holdDuration + exitDuration * NEXT_STARTS_AT_EXIT_FRACTION;
    const ORIGINAL_LOCAL_DURATION = CHAPTERS_START + (chapterCount - 1) * advance + entryDuration;
    const scaleFactor = T_FINAL / ORIGINAL_LOCAL_DURATION;
    const scrollDistance = `+=${Math.round(BASE_SCROLL_DISTANCE_PERCENT * scaleFactor)}%`;

    let brandPauseFixed = false;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: stage,
        start: "top top",
        end: scrollDistance,
        scrub: 0.4,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onToggle: (self) => {
          gsap.set([label, titleLine1, titleLine2], { visibility: self.isActive ? "visible" : "hidden" });
          // 2026-07-28 (corrección de continuidad nº4): este .stage solo
          // sube por encima del .stickyStage de MarketingReel (z-index 5,
          // MarketingReel.module.css) cuando su PROPIO pin está realmente
          // activo -- así, mientras los paneles de vídeo todavía están
          // pinneados y saliendo, quedan siempre por encima y se ven
          // ascender físicamente en vez de quedar tapados.
          gsap.set(stage, { zIndex: self.isActive ? 7 : "auto" });
        },
        onUpdate:
          isWideDesktop && brandPauseSection
            ? (self) => {
                const localTime = self.progress * T_FINAL;
                // ON: en cuanto el handoff empieza (progreso 0-1 del propio
                // scrub). OFF: inmediato en self.progress===1 -- la propia
                // señal del pin, sin ninguna espera adicional. Antes esto
                // requería un colchón manual porque el pin-spacer de GSAP
                // reservaba además la altura natural de .stage tras
                // liberar el pin (la posición natural en flujo de
                // BrandPause quedaba más abajo que self.end); ahora
                // SellingErrors.module.css (.stage, >=1024px) cancela esa
                // reserva con margin-bottom:-100vh, así que self.end YA
                // coincide con la posición natural de BrandPause -- liberar
                // aquí mismo, sin esperar nada más, no deja ver una segunda
                // franja verde.
                const pastEnd = self.progress >= 1;
                const shouldBeFixed = localTime >= T_SETTLED && !pastEnd;
                if (shouldBeFixed !== brandPauseFixed) {
                  brandPauseFixed = shouldBeFixed;
                  if (shouldBeFixed) {
                    gsap.set(brandPauseSection, {
                      position: "fixed",
                      top: 0,
                      left: 0,
                      // +2px de solape real (no 100vw exacto): con ambos
                      // paneles fijos en capas de composición independientes,
                      // el borde animado por xPercent (stage: 0->100,
                      // BrandPause: -100->0, misma fracción p) deja una
                      // costura de subpíxel si sus anchos medidos no
                      // coinciden EXACTAMENTE al frame -- z-index 8 > 7
                      // (stage) hace que este panel siempre gane esa franja,
                      // así que un ligero exceso de ancho la cierra sin
                      // desplazar el contenido interno de forma perceptible.
                      width: "calc(100vw + 2px)",
                      height: "100svh",
                      zIndex: 8,
                    });
                  } else {
                    gsap.set(brandPauseSection, { clearProps: "position,top,left,width,height,zIndex" });
                  }
                }
                // Una vez liberado, BrandPause ya está en flujo normal
                // genuino -- el propio rect (por debajo del punto de
                // muestreo cuando el usuario sigue bajando hacia
                // ProjectsGallery) decide solo cuándo deja de contar, vía
                // el mecanismo genérico de useHeaderState.ts. Aquí basta
                // con no tocar más los atributos (quedan en su último
                // valor, "oculto"/"oscuro", correcto mientras siga a la
                // vista).
                if (!pastEnd) {
                  const handoffProgress =
                    HANDOFF_DURATION > 0 ? gsap.utils.clamp(0, 1, (localTime - T_SETTLED) / HANDOFF_DURATION) : 0;
                  const shouldHideHeader = handoffProgress >= HEADER_HIDE_AT_HANDOFF_FRACTION;
                  brandPauseSection.setAttribute("data-header-hide", shouldHideHeader ? "true" : "false");
                  if (shouldHideHeader) {
                    brandPauseSection.setAttribute("data-header-tone", "dark");
                  } else {
                    brandPauseSection.removeAttribute("data-header-tone");
                  }
                }
              }
            : undefined,
      },
    });

    // Posición 0 exacta: relevo instantáneo etiqueta/título -- la capa eco
    // ya hizo la aparición gradual mientras el vídeo anterior seguía
    // visible, así que aquí no hay nada que animar, solo "heredar" el
    // resultado en el mismo instante en que el scrub realmente arranca
    // (tl.set, no tl.to: sin esto, position:relative dejaría el
    // contenido real visible unos px antes de tiempo -- ver gsap.set de
    // arriba).
    tl.set([label, titleLine1, titleLine2], { opacity: 1, y: 0 }, 0)
      // 0.10 -> 0.20: entra el texto introductorio derecho -- "casi al
      // mismo tiempo" que el título (que ya está visible desde el propio
      // instante del relevo, vía la capa eco). Se asienta y aguanta ahí
      // hasta 0.40 -- eso NO se ha tocado.
      .to(intro, { opacity: 1, y: 0, duration: 0.1, ease: "none" }, 0.1);

    // Salida de la intro (2026-07-29, corrección de solapamiento): antes
    // duraba 0.10 (0.40->0.50), solapando con TODA la entrada Y buena
    // parte de la permanencia del capítulo 01. Ahora dura lo mismo que la
    // entrada del capítulo 01 y termina exactamente cuando este llega a
    // opacity 1 -- un cruce breve con ambos poco visibles, nunca los dos
    // legibles a la vez.
    tl.to(intro, { opacity: 0, y: -40, scale: 0.97, duration: introExitDuration, ease: "none" }, CHAPTERS_START);
    tl.set(intro, { visibility: "hidden" }, CHAPTERS_START + introExitDuration);

    // Cada capítulo: entra (18% de su hueco) -> permanece quieto y
    // legible (54%, la fase más larga con diferencia) -> sale (20%) ->
    // el siguiente entra cuando este lleva un 90% de su propia salida.
    // visibility refuerza opacity en los dos extremos exactos (nunca a
    // mitad de una fase visible, así que no se nota el salto). 2026-07-30:
    // ahora TODOS salen, incluido el capítulo 04 (antes se quedaba fijo).
    chapterEls.forEach((el, i) => {
      const t = chapterTimings[i];
      tl.set(el, { visibility: "visible" }, t.entryStart);
      tl.to(el, { opacity: 1, y: 0, duration: entryDuration, ease: "none" }, t.entryStart);
      tl.to(el, { opacity: 0, y: -40, scale: 0.97, duration: exitDuration, ease: "none" }, t.holdEnd);
      tl.set(el, { visibility: "hidden" }, t.exitEnd);
    });

    // Vuelta a la intro (2026-07-30): mismo fade que su propia salida, en
    // sentido inverso -- SellingErrors real queda así en su composición
    // introductoria final (izquierda + intro/cierre derecha), lista como
    // primer panel del handoff hacia BrandPause.
    tl.set(intro, { visibility: "visible" }, introReturnStart);
    tl.to(intro, { opacity: 1, y: 0, scale: 1, duration: introReturnDuration, ease: "none" }, introReturnStart);

    // Handoff horizontal (2026-07-30, solo >=1024px; 2026-07-30 corrección
    // de sentido): .stage (real, el mismo de siempre) sale deslizando a la
    // DERECHA mientras la sección real de BrandPause entra desde la
    // IZQUIERDA -- xPercent 0->100 / -100->0 en la MISMA ventana, así que
    // tilan borde a borde en todo momento (comprobado: brandPause.right =
    // 100vw*p, stage.left = 100vw*p para el mismo p -- coinciden
    // exactamente, cero solape, cero hueco). Un único tween por elemento,
    // sin timeline aparte.
    if (isWideDesktop && brandPauseSection && HANDOFF_DURATION > 0) {
      tl.to(stage, { xPercent: 100, duration: HANDOFF_DURATION, ease: "none" }, T_SETTLED);
      tl.to(brandPauseSection, { xPercent: 0, duration: HANDOFF_DURATION, ease: "none" }, T_SETTLED);
    }

    const unsubscribe = subscribeFrame(() => ScrollTrigger.update());

    return () => {
      unsubscribe();
      echoTrigger.kill();
      tl.scrollTrigger?.kill();
      tl.kill();
      if (brandPauseSection) {
        gsap.set(brandPauseSection, { clearProps: "position,top,left,width,height,zIndex,xPercent" });
        brandPauseSection.setAttribute("data-header-hide", "true");
        brandPauseSection.setAttribute("data-header-tone", "dark");
      }
    };
  }, [chapterCount]);

  return {
    sectionRef,
    stageRef,
    labelRef,
    titleLine1Ref,
    titleLine2Ref,
    introRef,
    chapterRefs,
    earlyRevealRef,
    earlyLabelRef,
    earlyTitleLine1Ref,
    earlyTitleLine2Ref,
  };
}
