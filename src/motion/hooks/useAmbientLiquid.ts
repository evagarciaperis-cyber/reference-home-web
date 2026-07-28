"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion, canHover } from "../core/media";
import { subscribeFrame } from "../core/frameTicker";
import { HERO_NARRATIVE_VH } from "../core/heroGeometry";
import { createLiquidRenderer, type LiquidRenderer } from "../webgl/liquidBackground";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

// #E8C7A3 / #86AFAE en 0..1 -- los dos únicos colores de la superficie,
// sin añadir ninguno nuevo.
const WARM_COLOR: [number, number, number] = [0xe8 / 255, 0xc7 / 255, 0xa3 / 255];
const TEAL_COLOR: [number, number, number] = [0x86 / 255, 0xaf / 255, 0xae / 255];

const EDGE_PX = 42; // "transición exterior difuminada de aproximadamente 35-55px"

const SCROLL_RANGE_PX = 1800;
const SCROLL_AMP_WARM = { x: 20, y: 28 };
const SCROLL_AMP_TEAL = { x: -24, y: -18 };

const MOBILE_FRAME_INTERVAL_MS = 1000 / 30; // "limitar el render a 30fps" en móvil

type PointDef = {
  offset: { x: number; y: number }; // posición de reposo relativa al centro del grupo
  radius: number;
  lerp: number; // núcleo: 0.055-0.075; cercanos: 0.035-0.05; retrasados: 0.018-0.032
  pointerMax: number; // desplazamiento máximo por puntero, px (núcleo hasta 90, cola hasta 130)
  idleAmp: { x: number; y: number }; // 6-12px escritorio (4-6px móvil, aplicado aparte)
  idlePeriodSec: number; // 12-20s
  idlePhase: number;
};

// Cinco puntos cálidos (núcleo + 4 secundarios) / cuatro verdes (núcleo +
// 3 secundarios), distribución irregular a propósito -- nunca una
// cuadrícula ni una simetría entre puntos.
const WARM_POINTS: PointDef[] = [
  { offset: { x: 0, y: 0 }, radius: 95, lerp: 0.065, pointerMax: 90, idleAmp: { x: 9, y: 7 }, idlePeriodSec: 15, idlePhase: 0 },
  { offset: { x: -70, y: -40 }, radius: 55, lerp: 0.045, pointerMax: 105, idleAmp: { x: 11, y: 8 }, idlePeriodSec: 18, idlePhase: 1.1 },
  { offset: { x: 65, y: -55 }, radius: 45, lerp: 0.04, pointerMax: 100, idleAmp: { x: 7, y: 12 }, idlePeriodSec: 13, idlePhase: 2.6 },
  { offset: { x: -45, y: 60 }, radius: 50, lerp: 0.025, pointerMax: 125, idleAmp: { x: 10, y: 6 }, idlePeriodSec: 20, idlePhase: 3.4 },
  { offset: { x: 80, y: 45 }, radius: 40, lerp: 0.02, pointerMax: 130, idleAmp: { x: 6, y: 10 }, idlePeriodSec: 17, idlePhase: 4.8 },
];

const TEAL_POINTS: PointDef[] = [
  { offset: { x: 0, y: 0 }, radius: 90, lerp: 0.06, pointerMax: 90, idleAmp: { x: 8, y: 9 }, idlePeriodSec: 16, idlePhase: 0.6 },
  { offset: { x: 60, y: -45 }, radius: 50, lerp: 0.042, pointerMax: 105, idleAmp: { x: 12, y: 7 }, idlePeriodSec: 19, idlePhase: 2.0 },
  { offset: { x: -55, y: -35 }, radius: 42, lerp: 0.028, pointerMax: 120, idleAmp: { x: 7, y: 11 }, idlePeriodSec: 14, idlePhase: 3.7 },
  { offset: { x: 40, y: 55 }, radius: 46, lerp: 0.022, pointerMax: 125, idleAmp: { x: 9, y: 6 }, idlePeriodSec: 21, idlePhase: 5.2 },
];

type PointState = { x: number; y: number };

type GroupRuntime = {
  points: PointDef[];
  state: PointState[];
  prevCore: { x: number; y: number };
  centerFrac: { x: number; y: number }; // fracción del canvas -- "centro-izquierda"/"centro-derecha"
  invert: boolean;
  scrollAmp: { x: number; y: number };
  color: [number, number, number];
  positionsBuf: Float32Array;
  radiiBuf: Float32Array;
};

/**
 * Superficie líquida del fondo de Manifesto (2026-07-27, octava
 * corrección): sustituye por completo la implementación anterior basada
 * en divs/CSS (blobs, clusters, border-radius animado) por un único
 * <canvas> WebGL renderizado mediante un campo de metaballs (ver
 * liquidBackground.ts) -- nueve puntos de influencia en total (5 cálidos,
 * 4 verde agua) que se funden en una silueta orgánica por color.
 *
 * Elección técnica: WebGL puro, sin librería. El proyecto no tenía OGL ni
 * Three.js instalados (comprobado en package.json); para un único plano
 * a pantalla completa con un único shader personalizado, WebGL a pelo es
 * más ligero que cualquiera de las dos (0 bytes de dependencia añadida
 * frente a los ~30-40KB de OGL o los varios cientos de KB de Three.js) y
 * ofrece control total sobre el shader, que es exactamente lo que pide
 * este efecto -- "la solución más ligera y controlable" del encargo
 * original se cumple con más margen así que con cualquiera de las dos
 * opciones sugeridas como referencia.
 *
 * Arquitectura de movimiento: un único suscriptor al requestAnimationFrame
 * COMPARTIDO de frameTicker.ts (el mismo bucle que SmoothScrollProvider.tsx
 * ya mantiene vivo para lenis.raf()) -- nunca un bucle propio, nunca
 * renderer.setAnimationLoop. Cada punto interpola su posición hacia un
 * objetivo (centro del grupo + desplazamiento de reposo + atracción del
 * puntero) con su propio lerp -- núcleo más estable (0.055-0.075),
 * secundarios cercanos (0.035-0.05) y retrasados (0.018-0.032), nunca el
 * mismo valor -- y ese propio lerp hace que seguir moviéndose unos
 * instantes tras soltar el puntero, la "cola" y la oscilación residual
 * salgan de la física en sí, no de un temporizador aparte. La velocidad
 * (para el estiramiento/compresión anisótropo del shader) se lee del
 * propio desplazamiento del núcleo entre este frame y el anterior -- no
 * hay un sistema de velocidad independiente. Posiciones/velocidades viven
 * en objetos mutables (nunca useState) leídos y escritos directamente
 * dentro del callback del ticker.
 */
export function useAmbientLiquid<T extends HTMLElement>() {
  const containerRef = useRef<T>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const hero = document.getElementById("inicio");
    if (!container || !canvas || !hero) return;

    const renderer: LiquidRenderer | null = createLiquidRenderer(canvas);
    if (!renderer) return; // sin soporte WebGL -- el fondo queda en el color base de CSS, sin efecto

    const reducedMotion = prefersReducedMotion();
    const canPointerInteract = !reducedMotion && canHover();
    const dpr = Math.min(window.devicePixelRatio || 1, canHover() ? 1.5 : 1);

    let canvasWidth = 0;
    let canvasHeight = 0;

    const makeRuntime = (points: PointDef[], centerFrac: { x: number; y: number }, invert: boolean, scrollAmp: { x: number; y: number }, color: [number, number, number]): GroupRuntime => ({
      points,
      state: points.map((p) => ({ x: p.offset.x, y: p.offset.y })),
      prevCore: { x: 0, y: 0 },
      centerFrac,
      invert,
      scrollAmp,
      color,
      positionsBuf: new Float32Array(points.length * 2),
      radiiBuf: new Float32Array(points.map((p) => p.radius)),
    });

    const warm = makeRuntime(WARM_POINTS, { x: 0.32, y: 0.38 }, false, SCROLL_AMP_WARM, WARM_COLOR);
    const teal = makeRuntime(TEAL_POINTS, { x: 0.7, y: 0.56 }, true, SCROLL_AMP_TEAL, TEAL_COLOR);

    const resize = () => {
      const rect = container!.getBoundingClientRect();
      canvasWidth = rect.width;
      canvasHeight = rect.height;
      renderer.resize(rect.width, rect.height, dpr);
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    let isVisible = true;
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        isVisible = entries[entries.length - 1]?.isIntersecting ?? true;
      },
      { threshold: 0 },
    );
    intersectionObserver.observe(container);

    const pointerTarget = { x: 0, y: 0 };
    const onPointerMove = (event: PointerEvent) => {
      const rect = container!.getBoundingClientRect();
      pointerTarget.x = clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
      pointerTarget.y = clamp(((event.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
    };
    const onPointerLeave = () => {
      pointerTarget.x = 0;
      pointerTarget.y = 0;
    };
    if (canPointerInteract) {
      container.addEventListener("pointermove", onPointerMove);
      container.addEventListener("pointerleave", onPointerLeave);
    }

    const idleAmpScale = canPointerInteract ? 1 : 0.5; // "amplitud máxima de 4-6px" en móvil frente a 6-12px en escritorio

    const renderGroup = (group: GroupRuntime, t: number, local: number) => {
      const centerX = group.centerFrac.x * canvasWidth;
      const centerY = group.centerFrac.y * canvasHeight;

      const scrollX = clamp((local / SCROLL_RANGE_PX) * group.scrollAmp.x, -Math.abs(group.scrollAmp.x), Math.abs(group.scrollAmp.x));
      const scrollY = clamp((local / SCROLL_RANGE_PX) * group.scrollAmp.y, -Math.abs(group.scrollAmp.y), Math.abs(group.scrollAmp.y));

      const px = group.invert ? -pointerTarget.x : pointerTarget.x;
      const py = group.invert ? -pointerTarget.y : pointerTarget.y;

      for (let i = 0; i < group.points.length; i++) {
        const def = group.points[i];
        const idleOmega = (2 * Math.PI) / def.idlePeriodSec;
        const idleX = Math.sin(t * idleOmega + def.idlePhase) * def.idleAmp.x * idleAmpScale;
        const idleY = Math.cos(t * idleOmega * 1.2 + def.idlePhase) * def.idleAmp.y * idleAmpScale;

        const targetX = centerX + scrollX + def.offset.x + idleX + px * def.pointerMax;
        const targetY = centerY + scrollY + def.offset.y + idleY + py * def.pointerMax;

        const st = group.state[i];
        st.x = lerp(st.x, targetX, def.lerp);
        st.y = lerp(st.y, targetY, def.lerp);

        // Coordenadas de canvas WebGL: origen abajo-izquierda, en píxeles
        // físicos (dpr aplicado); las de arriba están en píxeles CSS con
        // origen arriba-izquierda (mismo espacio que el puntero).
        group.positionsBuf[i * 2] = st.x * dpr;
        group.positionsBuf[i * 2 + 1] = (canvasHeight - st.y) * dpr;
      }

      const core = group.state[0];
      const velX = core.x - group.prevCore.x;
      const velY = core.y - group.prevCore.y;
      group.prevCore.x = core.x;
      group.prevCore.y = core.y;

      const speed = Math.hypot(velX, velY);
      const maxStretch = 0.12;
      const maxSquash = 0.08;
      // Sensibilidad calibrada para que una velocidad "de barrido normal"
      // (unos 15-25px de desplazamiento del núcleo entre frames a 60fps)
      // ya alcance una fracción visible del máximo, sin llegar a él con
      // cualquier microvibración -- "limita la velocidad para evitar
      // deformaciones violentas".
      const stretchAmt = clamp(speed * 0.006, 0, maxStretch);
      const squashAmt = clamp(speed * 0.004, 0, maxSquash);
      const dir: [number, number] = speed > 0.01 ? [velX / speed, -velY / speed] : [1, 0]; // -y: pasa de espacio CSS (y abajo) a espacio GL (y arriba)

      return { stretchDir: dir, stretchAmt, squashAmt };
    };

    let lastMobileFrameTime = 0;

    const onFrame = (time: number) => {
      if (!isVisible) return;
      if (!canPointerInteract) {
        if (time - lastMobileFrameTime < MOBILE_FRAME_INTERVAL_MS) return;
        lastMobileFrameTime = time;
      }

      const heroDocTop = window.scrollY + hero!.getBoundingClientRect().top;
      const wipeStart = heroDocTop + HERO_NARRATIVE_VH * window.innerHeight;
      const local = window.scrollY - wipeStart;
      const t = time / 1000;

      const warmDeform = renderGroup(warm, t, local);
      const tealDeform = renderGroup(teal, t, local);

      renderer.render({
        time: t,
        edgePx: EDGE_PX * dpr,
        warm: {
          points: warm.positionsBuf,
          radii: warm.radiiBuf.map((r) => r * dpr),
          stretchDir: warmDeform.stretchDir,
          stretchAmt: warmDeform.stretchAmt,
          squashAmt: warmDeform.squashAmt,
          color: warm.color,
        },
        teal: {
          points: teal.positionsBuf,
          radii: teal.radiiBuf.map((r) => r * dpr),
          stretchDir: tealDeform.stretchDir,
          stretchAmt: tealDeform.stretchAmt,
          squashAmt: tealDeform.squashAmt,
          color: teal.color,
        },
      });
    };

    let unsubscribe: (() => void) | null = null;
    if (reducedMotion) {
      // Una única imagen estática del campo orgánico, en reposo (sin
      // puntero, sin scroll, sin drift): nunca se suscribe al ticker.
      const staticFrame = (group: GroupRuntime) => {
        const centerX = group.centerFrac.x * canvasWidth;
        const centerY = group.centerFrac.y * canvasHeight;
        for (let i = 0; i < group.points.length; i++) {
          const def = group.points[i];
          group.positionsBuf[i * 2] = (centerX + def.offset.x) * dpr;
          group.positionsBuf[i * 2 + 1] = (canvasHeight - (centerY + def.offset.y)) * dpr;
        }
      };
      staticFrame(warm);
      staticFrame(teal);
      renderer.render({
        time: 0,
        edgePx: EDGE_PX * dpr,
        warm: { points: warm.positionsBuf, radii: warm.radiiBuf.map((r) => r * dpr), stretchDir: [1, 0], stretchAmt: 0, squashAmt: 0, color: warm.color },
        teal: { points: teal.positionsBuf, radii: teal.radiiBuf.map((r) => r * dpr), stretchDir: [1, 0], stretchAmt: 0, squashAmt: 0, color: teal.color },
      });
    } else {
      unsubscribe = subscribeFrame(onFrame);
    }

    return () => {
      unsubscribe?.();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      if (canPointerInteract) {
        container.removeEventListener("pointermove", onPointerMove);
        container.removeEventListener("pointerleave", onPointerLeave);
      }
      renderer.dispose();
    };
  }, []);

  return { containerRef, canvasRef };
}
