"use client";

import { useEffect, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { easeInOutCubic } from "../core/easing";
import { prefersReducedMotion } from "../core/media";
import { subscribeFrame } from "../core/frameTicker";
import { requestHeaderToneRefresh } from "../core/events";

let pluginRegistered = false;

const DESKTOP_QUERY = "(min-width: 901px)";

const ROW_COUNT = 5;
const ROW_GAP_PX = 16; // debe coincidir con .rows{gap} en BrandStory.module.css
const CURSOR_TOP_THRESHOLD_PX = 80;
// La fila activa ocupa ~36% de la altura útil (dentro del 34-38% pedido);
// las 4 inactivas se reparten el resto a partes iguales -- ver measure().
const ACTIVE_HEIGHT_FRACTION = 0.38;
const MIN_COMPACT_PX = 64;
const MIN_ACTIVE_DELTA_PX = 80;

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);
const smoothstep = (x: number, edge0: number, edge1: number) => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

type StageWindow = { enterStart: number | null; enterEnd: number | null; leaveStart: number | null; leaveEnd: number | null };

// 5 etapas, ~0.20 de progreso cada una, con la ventana de entrada de una
// encajada exactamente en la ventana de salida de la anterior -- nunca un
// hueco muerto entre etapas. La 0 empieza ya activa (sin entrada propia);
// la 4 se queda asentada hasta el final (sin salida propia).
const STAGES: StageWindow[] = [
  { enterStart: null, enterEnd: null, leaveStart: 0.16, leaveEnd: 0.2 },
  { enterStart: 0.16, enterEnd: 0.2, leaveStart: 0.36, leaveEnd: 0.4 },
  { enterStart: 0.36, enterEnd: 0.4, leaveStart: 0.56, leaveEnd: 0.6 },
  { enterStart: 0.56, enterEnd: 0.6, leaveStart: 0.76, leaveEnd: 0.8 },
  { enterStart: 0.76, enterEnd: 0.8, leaveStart: null, leaveEnd: null },
];

const REVEAL_TARGETS: Record<string, { rx: number; ry: number }> = {
  ellipse: { rx: 150, ry: 150 },
  "ellipse-wide": { rx: 220, ry: 90 },
};

type Refs = {
  sectionRef: RefObject<HTMLElement | null>;
};

/**
 * "El recorrido" -- la línea vertical es el controlador narrativo real:
 * un único ScrollTrigger (pin + scrub) sobre la sección, sin
 * gsap.timeline()/tl.to() discretos -- todo el estado visual (altura de
 * cada fila, posición del punto que asciende, revelado lineal ->
 * fotografía por máscara) se deriva analíticamente de self.progress
 * dentro de un solo onUpdate, sin leer el DOM en el camino caliente (ver
 * rowHeight()/centers más abajo) y sin requestAnimationFrame propio
 * (subscribeFrame mantiene ScrollTrigger.update() en el mismo tick de
 * rAF que SmoothScrollProvider.tsx ya usa para Lenis -- evita un segundo
 * bucle desincronizado).
 *
 * Las alturas de fila (compactHeightPx/activeDeltaPx, derivadas en
 * measure() de ACTIVE_HEIGHT_FRACTION) son la única fuente de verdad: la
 * fila que gana protagonismo crece, las demás se mantienen compactas, y
 * esa diferencia de altura reordena el resto por
 * flujo normal de documento (nunca position:absolute ni cálculo manual
 * de posiciones en el DOM). El punto y el relleno de la línea
 * (--point-y/--route-fill-h) se calculan como la media ponderada por
 * "expand" de los centros de cada fila -- continua por construcción,
 * nunca salta al cambiar de etapa dominante porque las ventanas de
 * entrada/salida de etapas vecinas comparten exactamente el mismo tramo
 * (STAGES, arriba).
 */
export function useBrandStory({ sectionRef }: Refs): void {
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    if (prefersReducedMotion()) return;
    if (!window.matchMedia(DESKTOP_QUERY).matches) return;

    const rows = Array.from(section.querySelectorAll<HTMLElement>("[data-story-row]"));
    const rowsContainer = section.querySelector<HTMLElement>("[data-story-rows]");
    const fillEl = section.querySelector<HTMLElement>("[data-story-line]");
    const pointEl = section.querySelector<HTMLElement>("[data-story-point]");
    if (rows.length !== ROW_COUNT || !rowsContainer || !fillEl || !pointEl) return;
    const fill: HTMLElement = fillEl;
    const point: HTMLElement = pointEl;

    const visuals = rows.map((row) => row.querySelector<HTMLElement>("[data-story-visual]"));
    const revealTargets = visuals.map((visual) => REVEAL_TARGETS[visual?.dataset.revealShape ?? "ellipse"]);
    const nodeLayers = rows.map((row) => ({
      dot: row.querySelector<HTMLElement>("[data-story-node-dot]"),
      halo: row.querySelector<HTMLElement>("[data-story-node-halo]"),
      arc: row.querySelector<HTMLElement>("[data-story-node-arc]"),
    }));

    if (!pluginRegistered) {
      gsap.registerPlugin(ScrollTrigger);
      pluginRegistered = true;
    }

    // Centrado único para las 3 capas del nodo, en las 5 filas (no solo
    // la activa): xPercent/yPercent -50 es el equivalente GSAP de
    // transform:translate(-50%,-50%), pero como su PROPIA parte del
    // transform -- así, cuando startNodeAnimation() más abajo anima
    // scale/opacity/rotation sobre estos mismos elementos, GSAP compone
    // ambos en un único transform sin pisar el centrado. Se hace una
    // sola vez aquí (no dentro del gsap.context() por fila) porque
    // .rowNodeDot es siempre visible, también en las 4 filas inactivas
    // que nunca llegan a animarse.
    const allNodeLayerEls = nodeLayers.flatMap((l) => [l.dot, l.halo, l.arc]).filter((el): el is HTMLElement => !!el);
    gsap.set(allNodeLayerEls, { xPercent: -50, yPercent: -50 });

    // .rows tiene una altura real y acotada (top/bottom fijos, ver CSS)
    // -- se mide UNA VEZ al montar y en cada resize, nunca dentro de
    // render() (que corre cada frame de scroll). La fila activa recibe
    // ACTIVE_HEIGHT_FRACTION del alto útil (descontados los huecos entre
    // las 5 filas); las 4 compactas se reparten el resto a partes
    // iguales. El resultado se escribe como --row-compact-h/--row-active-
    // delta en el propio contenedor (herencia normal de custom
    // properties) para que .row{height:calc(...)} en CSS use EXACTAMENTE
    // los mismos números que este archivo usa para calcular centros/
    // posición del punto -- altura real y altura calculada nunca pueden
    // desincronizarse.
    let compactHeightPx = 84;
    let activeDeltaPx = 140;
    function measure() {
      const available = rowsContainer!.clientHeight;
      const totalGaps = ROW_GAP_PX * (ROW_COUNT - 1);
      const contentHeight = Math.max(0, available - totalGaps);
      const activeHeight = contentHeight * ACTIVE_HEIGHT_FRACTION;
      const inactiveTotal = contentHeight - activeHeight;
      compactHeightPx = Math.max(MIN_COMPACT_PX, inactiveTotal / (ROW_COUNT - 1));
      activeDeltaPx = Math.max(MIN_ACTIVE_DELTA_PX, activeHeight - compactHeightPx);
      rowsContainer!.style.setProperty("--row-compact-h", `${compactHeightPx}px`);
      rowsContainer!.style.setProperty("--row-active-delta", `${activeDeltaPx}px`);
    }
    measure();

    function expandFractionFor(stage: StageWindow, p: number): number {
      let enter = 1;
      if (stage.enterStart !== null && stage.enterEnd !== null) {
        enter = easeInOutCubic(clamp((p - stage.enterStart) / (stage.enterEnd - stage.enterStart), 0, 1));
      }
      let leave = 0;
      if (stage.leaveStart !== null && stage.leaveEnd !== null) {
        leave = easeInOutCubic(clamp((p - stage.leaveStart) / (stage.leaveEnd - stage.leaveStart), 0, 1));
      }
      return enter * (1 - leave);
    }

    function rowHeight(expand: number): number {
      return compactHeightPx + activeDeltaPx * expand;
    }

    // -- Animación del nodo activo (GSAP, 3 capas) -- respiración del
    // punto central, halo que pulsa, aro parcial que gira. Vive fuera
    // del math analítico de render()/onUpdate: no depende de
    // self.progress, solo de CUÁL fila es la activa en cada momento,
    // así que no compite con el cálculo del punto/línea ni añade
    // lecturas del DOM al camino caliente. gsap.context() agrupa las
    // 3 animaciones de una fila para poder matarlas y revertir sus
    // estilos inline de una sola vez (revert()) al desactivarse --
    // nunca queda un scale/opacity/rotation residual en la siguiente
    // fila activa, y nunca se crea una timeline nueva por frame (solo
    // cuando activeIndex realmente cambia, ver render() más abajo).
    let activeNodeIndex = -1;
    let nodeCtx: gsap.Context | null = null;

    function stopNodeAnimation() {
      if (nodeCtx) {
        nodeCtx.revert();
        nodeCtx = null;
      }
    }

    function startNodeAnimation(index: number) {
      stopNodeAnimation();
      const layers = nodeLayers[index];
      if (!layers?.dot || !layers.halo || !layers.arc) return;
      const { dot, halo, arc } = layers;
      nodeCtx = gsap.context(() => {
        // Capa 1 -- respiración del punto central (no toca su
        // posición/tamaño/color base, que siguen en .rowNode).
        gsap.to(dot, { scale: 1.1, duration: 2.2, ease: "sine.inOut", repeat: -1, yoyo: true });
        // Capa 2 -- halo que se expande y desvanece, con un pequeño
        // delay para no arrancar exactamente en fase con el punto.
        gsap.fromTo(
          halo,
          { scale: 0.85, opacity: 0.5 },
          { scale: 1.6, opacity: 0, duration: 2.7, ease: "power2.out", repeat: -1, repeatDelay: 0.3, delay: 0.2 }
        );
        // Capa 3 -- aro parcial: un fade-in único (para no parpadear
        // en cada vuelta) y luego rotación continua e infinita,
        // desfasada respecto a las otras dos capas.
        gsap.set(arc, { rotation: 0 });
        gsap.to(arc, { opacity: 0.55, duration: 0.6, ease: "power1.out", delay: 0.4 });
        gsap.to(arc, { rotation: 360, duration: 5.2, ease: "none", repeat: -1, delay: 0.4 });
      });
      activeNodeIndex = index;
    }

    function render(p: number) {
      const expands = STAGES.map((stage) => expandFractionFor(stage, p));

      // Centro vertical de cada fila en flujo (suma de alturas + huecos
      // anteriores + mitad de la propia) -- recalculado cada frame a
      // partir de "expands", nunca leyendo getBoundingClientRect().
      const centers: number[] = [];
      let cursor = 0;
      for (let i = 0; i < ROW_COUNT; i++) {
        const h = rowHeight(expands[i]);
        centers[i] = cursor + h / 2;
        cursor += h + ROW_GAP_PX;
      }

      let weightedSum = 0;
      let totalWeight = 0;
      for (let i = 0; i < ROW_COUNT; i++) {
        weightedSum += centers[i] * expands[i];
        totalWeight += expands[i];
      }
      const pointCenterY = totalWeight > 0.001 ? weightedSum / totalWeight : centers[0];

      fill.style.setProperty("--route-fill-h", `${pointCenterY}px`);
      point.style.setProperty("--point-y", `${pointCenterY}px`);

      // Etapa dominante = la de mayor "expand" en este frame -- el
      // estado de cada fila se deriva de su ORDEN relativo a esa, nunca
      // de un umbral local (un umbral local re-etiquetaba la fila 0 como
      // "active" cada vez que su expand volvía a 0 tras dejarla atrás).
      let activeIndex = 0;
      let activeExpand = -1;
      for (let i = 0; i < ROW_COUNT; i++) {
        if (expands[i] > activeExpand) {
          activeExpand = expands[i];
          activeIndex = i;
        }
      }

      rows.forEach((row, i) => {
        const expand = expands[i];
        row.style.setProperty("--row-expand", expand.toFixed(4));
        row.dataset.storyRowState = i === activeIndex ? "active" : i < activeIndex ? "completed" : "future";

        const visual = visuals[i];
        const target = revealTargets[i];
        if (visual && target) {
          const revealT = smoothstep(expand, 0.3, 0.85);
          visual.style.setProperty("--reveal-rx", `${(target.rx * revealT).toFixed(2)}%`);
          visual.style.setProperty("--reveal-ry", `${(target.ry * revealT).toFixed(2)}%`);
        }
      });

      // Solo arranca/mata timelines cuando la fila activa realmente
      // cambia -- render() corre en cada frame de scroll, pero esta
      // comparación es O(1) y startNodeAnimation ya hace su propio
      // stopNodeAnimation() primero, así que nunca hay timelines
      // duplicadas ni una nueva por frame.
      if (activeIndex !== activeNodeIndex) {
        startNodeAnimation(activeIndex);
      }
    }

    // -- Cabecera: se pliega mientras el pin está activo y se hace scroll
    // hacia abajo, y se recupera al subir o si el cursor se acerca al
    // borde superior. Reutiliza self.isActive/self.direction del propio
    // ScrollTrigger (no hace falta un segundo listener de scroll para
    // detectar dirección) y el mecanismo ya existente
    // data-header-hide/requestHeaderToneRefresh -- useHeaderState.ts no
    // se toca, ya sabe leer ese atributo en cualquier sección.
    let cursorNearTop = false;
    let lastHide = false;

    function syncHeaderVisibility(isActive: boolean, direction: number) {
      const shouldHide = isActive && direction === 1 && !cursorNearTop;
      if (shouldHide === lastHide) return;
      lastHide = shouldHide;
      section!.setAttribute("data-header-hide", String(shouldHide));
      requestHeaderToneRefresh();
    }

    const handleMouseMove = (event: MouseEvent) => {
      const wasNearTop = cursorNearTop;
      cursorNearTop = event.clientY < CURSOR_TOP_THRESHOLD_PX;
      if (cursorNearTop !== wasNearTop) {
        syncHeaderVisibility(trigger.isActive, trigger.direction);
      }
    };
    window.addEventListener("mousemove", handleMouseMove);

    render(0);

    // scrub:true (sin lag) en vez de 0.6: el suavizado ya lo da Lenis
    // (SmoothScrollProvider.tsx) sobre el scroll nativo; una segunda capa
    // de scrub-easing aquí solo podía desincronizar este trigger frente al
    // de useFinalReveal.ts (que también usa scrub:true) justo en el
    // instante del relevo hacia FooterContact -- ver ese archivo para la
    // mecánica completa del relevo (este trigger no sabe nada de él; solo
    // termina de forma limpia, en position:fixed real, justo donde
    // empieza el siguiente).
    const trigger = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "+=450%",
      scrub: true,
      pin: true,
      pinSpacing: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        render(self.progress);
        syncHeaderVisibility(self.isActive, self.direction);
      },
      onLeave: () => syncHeaderVisibility(false, 1),
      onLeaveBack: () => syncHeaderVisibility(false, -1),
    });

    const handleResize = () => {
      measure();
      ScrollTrigger.refresh();
    };
    window.addEventListener("resize", handleResize);
    const unsubscribe = subscribeFrame(() => ScrollTrigger.update());

    return () => {
      unsubscribe();
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      section.setAttribute("data-header-hide", "false");
      requestHeaderToneRefresh();
      trigger.kill();
      stopNodeAnimation();
      [rowsContainer, fill, point, ...rows, ...visuals, ...allNodeLayerEls].forEach((el) => el?.removeAttribute("style"));
      rows.forEach((row) => delete row.dataset.storyRowState);
    };
  }, [sectionRef]);
}
