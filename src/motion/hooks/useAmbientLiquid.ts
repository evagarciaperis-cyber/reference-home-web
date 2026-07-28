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

// #E8C7A3 / #86AFAE en 0..1 -- únicos colores.
const WARM_COLOR: [number, number, number] = [0xe8 / 255, 0xc7 / 255, 0xa3 / 255];
const TEAL_COLOR: [number, number, number] = [0x86 / 255, 0xaf / 255, 0xae / 255];

const SCROLL_RANGE_PX = 1800;

type WaveConfig = {
  centerFrac: { x: number; y: number };
  sizeFrac: { w: number; h: number }; // fracción del bloque
  rotationDeg: number; // inclinación fija, no dinámica -- "no quiero física compleja"
  opacity: number;
  color: [number, number, number];
  scrollAmp: { x: number; y: number };
  pointerMax: { x: number; y: number };
  pointerLerp: number;
  invert: boolean;
  mobileSizeScale: number; // "más contenidas" en móvil
  breathePeriodSec: number;
  breathePhase: number;
};

// Dos ondas anchas y difuminadas -- no una gota, no una silueta. Cada una
// es UN solo campo gaussiano (ver liquidBackground.ts): sin física de
// estiramiento/cola/rotación dinámica, solo posición + escala + opacidad,
// cada una con una contribución pequeña de scroll, puntero y una
// respiración muy lenta.
const WARM: WaveConfig = {
  centerFrac: { x: 0.34, y: 0.26 },
  sizeFrac: { w: 0.58, h: 0.3 },
  rotationDeg: -8,
  opacity: 0.18,
  color: WARM_COLOR,
  scrollAmp: { x: 10, y: 16 },
  pointerMax: { x: 8, y: 6 },
  pointerLerp: 0.06,
  invert: false,
  mobileSizeScale: 0.7,
  breathePeriodSec: 21,
  breathePhase: 0,
};

const TEAL: WaveConfig = {
  centerFrac: { x: 0.68, y: 0.58 },
  sizeFrac: { w: 0.44, h: 0.26 },
  rotationDeg: 15,
  opacity: 0.12,
  color: TEAL_COLOR,
  scrollAmp: { x: -14, y: -10 },
  pointerMax: { x: 10, y: 8 },
  pointerLerp: 0.045,
  invert: true,
  mobileSizeScale: 0.65,
  breathePeriodSec: 24,
  breathePhase: 2.6,
};

const BREATHE_CENTER_AMP = 4; // px
const BREATHE_SCALE_AMP = 0.015; // ±1.5%
const BREATHE_OPACITY_AMP = 0.015;

type WaveState = { x: number; y: number };

/**
 * Fondo ambiental de Manifesto (2026-07-28, décima corrección --
 * reemplaza la gota líquida por dos ondas anchas y difuminadas, sin
 * silueta ni física compleja): cada onda es un único campo gaussiano
 * (liquidBackground.ts), sin puntos de influencia ni deformación
 * anisótropa. El movimiento de cada onda es la suma de tres
 * contribuciones pequeñas, todas calculadas dentro del mismo callback:
 *   1. deriva ligada al progreso local de scroll (directa, sin lerp
 *      propio -- el suavizado ya lo aporta Lenis en window.scrollY);
 *   2. respuesta al puntero, con su propio lerp (más lenta y en
 *      dirección contraria para la onda verde, igual que en todas las
 *      rondas anteriores);
 *   3. una respiración muy lenta (seno/coseno de baja frecuencia sobre
 *      el mismo timestamp del ticker) que mueve el centro, la escala y
 *      la opacidad en cantidades mínimas, con fase y periodo propios por
 *      onda.
 *
 * Un único suscriptor al requestAnimationFrame COMPARTIDO de
 * frameTicker.ts (el mismo bucle que SmoothScrollProvider.tsx mantiene
 * vivo para lenis.raf()) -- nunca un bucle propio. Sin listeners en
 * window, sin springs, sin CSS transition, solo refs mutables (nunca
 * setState) escritas directamente en uniforms de WebGL.
 *
 * Bajo prefers-reduced-motion no se suscribe al ticker ni añade
 * listeners de puntero: se renderiza una sola vez con ambas ondas en su
 * posición/escala/opacidad de reposo, sin respiración. En dispositivos
 * sin hover fino (canHover() = false) no hay respuesta al puntero, el
 * scroll se reduce al 50% y el tamaño de ambas ondas se reduce (más
 * contenidas en una pantalla estrecha).
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
    if (!renderer) return;

    const reducedMotion = prefersReducedMotion();
    const canPointerInteract = !reducedMotion && canHover();
    const dpr = Math.min(window.devicePixelRatio || 1, canHover() ? 1.5 : 1);
    const mobileScrollScale = canPointerInteract ? 1 : 0.5;

    let canvasWidth = 0;
    let canvasHeight = 0;

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

    const warmPointer: WaveState = { x: 0, y: 0 };
    const tealPointer: WaveState = { x: 0, y: 0 };

    const computeWave = (config: WaveConfig, pointerState: WaveState, t: number, local: number) => {
      const sizeScale = canPointerInteract ? 1 : config.mobileSizeScale;
      const scrollScale = mobileScrollScale;
      const scrollAmpX = config.scrollAmp.x * scrollScale;
      const scrollAmpY = config.scrollAmp.y * scrollScale;
      const scrollX = clamp((local / SCROLL_RANGE_PX) * scrollAmpX, -Math.abs(scrollAmpX), Math.abs(scrollAmpX));
      const scrollY = clamp((local / SCROLL_RANGE_PX) * scrollAmpY, -Math.abs(scrollAmpY), Math.abs(scrollAmpY));

      const vx = config.invert ? -pointerTarget.x : pointerTarget.x;
      const vy = config.invert ? -pointerTarget.y : pointerTarget.y;
      pointerState.x = lerp(pointerState.x, vx * config.pointerMax.x, config.pointerLerp);
      pointerState.y = lerp(pointerState.y, vy * config.pointerMax.y, config.pointerLerp);

      const breatheOmega = (2 * Math.PI) / config.breathePeriodSec;
      const breatheX = Math.sin(t * breatheOmega + config.breathePhase) * BREATHE_CENTER_AMP;
      const breatheY = Math.cos(t * breatheOmega * 1.3 + config.breathePhase) * BREATHE_CENTER_AMP;
      const breatheScale = 1 + Math.sin(t * breatheOmega * 0.7 + config.breathePhase) * BREATHE_SCALE_AMP;
      const breatheOpacity = Math.sin(t * breatheOmega * 0.5 + config.breathePhase * 1.2) * BREATHE_OPACITY_AMP;

      const centerX = config.centerFrac.x * canvasWidth + scrollX + pointerState.x + breatheX;
      const centerY = config.centerFrac.y * canvasHeight + scrollY + pointerState.y + breatheY;
      const halfW = (config.sizeFrac.w * canvasWidth * sizeScale * breatheScale) / 2;
      const halfH = (config.sizeFrac.h * canvasHeight * sizeScale * breatheScale) / 2;
      const opacity = clamp(config.opacity + (canPointerInteract ? breatheOpacity : 0), 0, 1);

      return {
        center: [centerX * dpr, (canvasHeight - centerY) * dpr] as [number, number],
        halfSize: [halfW * dpr, halfH * dpr] as [number, number],
        rotation: (config.rotationDeg * Math.PI) / 180,
        opacity,
        color: config.color,
      };
    };

    const onFrame = (time: number) => {
      if (!isVisible) return;

      const heroDocTop = window.scrollY + hero!.getBoundingClientRect().top;
      const wipeStart = heroDocTop + HERO_NARRATIVE_VH * window.innerHeight;
      const local = window.scrollY - wipeStart;
      const t = time / 1000;

      renderer.render({
        time: t,
        warm: computeWave(WARM, warmPointer, t, local),
        teal: computeWave(TEAL, tealPointer, t, local),
      });
    };

    let unsubscribe: (() => void) | null = null;
    if (reducedMotion) {
      const restWave = (config: WaveConfig) => ({
        center: [config.centerFrac.x * canvasWidth * dpr, canvasHeight * (1 - config.centerFrac.y) * dpr] as [number, number],
        halfSize: [(config.sizeFrac.w * canvasWidth * dpr) / 2, (config.sizeFrac.h * canvasHeight * dpr) / 2] as [number, number],
        rotation: (config.rotationDeg * Math.PI) / 180,
        opacity: config.opacity,
        color: config.color,
      });
      renderer.render({ time: 0, warm: restWave(WARM), teal: restWave(TEAL) });
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
