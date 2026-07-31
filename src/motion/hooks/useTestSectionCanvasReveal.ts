"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "../core/media";
import { subscribeFrame } from "../core/frameTicker";

const IMAGE_SRC = "/images/valoracion/reveal-valoracion.png";

const DPR_MAX = 2;
const MASK_SCALE = 0.5; // resolución del canvas auxiliar -- perf + el propio upscale suaviza el borde

const LERP = 0.13; // 0.10-0.16: cuánto se acerca la posición eased al cursor real cada frame
const SPEED_NORM = 1.2; // px/ms de la posición eased al que la "intensidad" satura a 1

const CORE_MIN = 100;
const CORE_MAX = 135;
const SECONDARY_MIN = 45;
const SECONDARY_MAX = 85;
const SEP_MIN = 25;
const SEP_MAX = 70;
const MASK_BLUR = 22; // px, 18-28 pedido -- único responsable de que los blobs se lean como un lóbulo unido
const SECONDARY_COUNT = 3;

const FADE_ALPHA_IDLE = 0.13; // decaimiento rápido -- estela corta en movimientos lentos
const FADE_ALPHA_FAST = 0.055; // decaimiento lento -- estela más larga cuando el cursor va rápido

const LINGER_MS = 700; // tras el último movimiento/salida, cuánto se sigue "tickeando" para dejar disipar

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

type Refs = {
  sectionRef: React.RefObject<HTMLElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onPointerEnter: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerLeave: (event: React.PointerEvent<HTMLElement>) => void;
};

/**
 * Mancha orgánica de varios lóbulos, con estela y disipación, que revela
 * la fotografía oculta bajo TestSection -- Canvas 2D puro (sin WebGL, sin
 * Three.js): sustituye la versión anterior basada en
 * `clip-path: ellipse()` (que, por mucho que se deformara, seguía
 * leyéndose como una forma geométrica única).
 *
 * Dos canvas:
 *  - `canvasRef` (visible, en el DOM, tamaño real de la sección): cada
 *    frame se limpia, se pinta la fotografía completa y nítida (nunca
 *    con blur), y se recorta con `globalCompositeOperation:
 *    "destination-in"` usando el canvas auxiliar como máscara.
 *  - `maskCanvas` (auxiliar, en memoria, nunca en el DOM, a mitad de
 *    resolución -- rendimiento y el propio upscale al componer suaviza
 *    el borde): acumula alpha con memoria -- cada frame se desvanece un
 *    poco (`destination-out` con alpha bajo) en vez de borrarse del
 *    todo, así queda estela; mientras hay actividad, se añade un
 *    racimo de círculos (un núcleo + 3 secundarios, orientados según la
 *    dirección/velocidad del cursor, con una variación senoidal
 *    determinista -- nunca Math.random() por frame) con
 *    `ctx.filter = blur(...)`, que es lo que funde los círculos en un
 *    solo lóbulo irregular en vez de mostrarlos como círculos sueltos.
 *
 * Posición: se suaviza con un lerp simple (0.13/frame) hacia el cursor
 * real -- la velocidad para deformar/alargar la mancha se calcula sobre
 * ESA posición eased (no sobre el cursor crudo), tal como se pidió.
 *
 * Se engancha al ticker de frames ya existente del proyecto
 * (`subscribeFrame`, el mismo que ya usa Lenis/ScrollTrigger) -- nunca un
 * `requestAnimationFrame` propio. Solo está suscrito mientras hay
 * actividad real (cursor dentro o estela todavía visible); pasado
 * `LINGER_MS` sin novedad se desuscribe y limpia ambos canvas por
 * completo (nunca queda una mancha residual).
 *
 * Texto blanco dentro de la mancha: desactivado en esta ronda a
 * propósito (la prioridad pedida era la mancha orgánica + nitidez de la
 * foto) -- ver TestSection.tsx.
 *
 * Táctil (hover:none) y prefers-reduced-motion: los manejadores no hacen
 * nada -- nunca se dibuja, el bloque se queda en fondo blanco + título
 * sin que este hook intervenga. Si el navegador no da contexto 2D
 * (`getContext("2d")` devuelve null), lo mismo: no se dibuja nada, sin
 * errores, mismo resultado visual de respaldo.
 */
export function useTestSectionCanvasReveal(): Refs {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const sizeRef = useRef({ width: 0, height: 0 });
  const targetRef = useRef({ x: 0, y: 0 });
  const easedRef = useRef({ x: 0, y: 0, lastX: 0, lastY: 0 });
  const addingRef = useRef(false);
  const activeUntilRef = useRef(0);
  const lastTickRef = useRef(0);
  const subscribedRef = useRef<(() => void) | null>(null);
  // La función de render real se crea dentro del useEffect (necesita el
  // ctx/maskCtx del montaje) -- se guarda aquí para que los manejadores
  // de puntero (fuera del efecto) puedan arrancar la suscripción sin
  // recrear el efecto en cada render.
  const renderRef = useRef<((time: number) => void) | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return; // sin contexto 2D disponible -- se queda en el fallback blanco, sin errores

    const maskCanvas = document.createElement("canvas");
    const maskCtx = maskCanvas.getContext("2d");
    if (!maskCtx) return;

    const img = new Image();
    const imageState = { ready: false };
    img.onload = () => {
      imageState.ready = true;
    };
    img.src = IMAGE_SRC;

    const resize = () => {
      const rect = section.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, DPR_MAX);
      sizeRef.current = { width: rect.width, height: rect.height };

      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const maskDpr = dpr * MASK_SCALE;
      maskCanvas.width = Math.max(1, Math.round(rect.width * maskDpr));
      maskCanvas.height = Math.max(1, Math.round(rect.height * maskDpr));
      maskCtx.setTransform(maskDpr, 0, 0, maskDpr, 0, 0);
    };
    resize();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(section);
    window.addEventListener("resize", resize);

    const stop = () => {
      subscribedRef.current?.();
      subscribedRef.current = null;
      const { width, height } = sizeRef.current;
      maskCtx.clearRect(0, 0, width, height);
      ctx.clearRect(0, 0, width, height);
    };

    const render = (time: number) => {
      const { width, height } = sizeRef.current;
      if (width === 0 || height === 0) return;

      const dt = Math.max(1, lastTickRef.current ? time - lastTickRef.current : 16.6);
      lastTickRef.current = time;

      // Posición eased -- lerp simple hacia el cursor real.
      const eased = easedRef.current;
      const target = targetRef.current;
      eased.lastX = eased.x;
      eased.lastY = eased.y;
      eased.x += (target.x - eased.x) * LERP;
      eased.y += (target.y - eased.y) * LERP;

      const moved = Math.abs(eased.x - eased.lastX) + Math.abs(eased.y - eased.lastY);
      const speed = Math.sqrt((eased.x - eased.lastX) ** 2 + (eased.y - eased.lastY) ** 2) / dt;
      const intensity = clamp(speed / SPEED_NORM, 0, 1);
      const angle = moved > 0.02 ? Math.atan2(eased.y - eased.lastY, eased.x - eased.lastX) : 0;

      // 1) Estela -- desvanecer lo ya pintado en vez de borrarlo (memoria).
      const fadeAlpha = FADE_ALPHA_IDLE - intensity * (FADE_ALPHA_IDLE - FADE_ALPHA_FAST);
      maskCtx.filter = "none";
      maskCtx.globalCompositeOperation = "destination-out";
      maskCtx.fillStyle = `rgba(0,0,0,${fadeAlpha})`;
      maskCtx.fillRect(0, 0, width, height);

      // 2) Racimo de lóbulos -- solo mientras hay actividad real.
      if (addingRef.current) {
        maskCtx.globalCompositeOperation = "source-over";
        maskCtx.filter = `blur(${MASK_BLUR}px)`;
        maskCtx.fillStyle = "#000";

        const coreRadius = CORE_MIN + intensity * (CORE_MAX - CORE_MIN);
        maskCtx.beginPath();
        maskCtx.arc(eased.x, eased.y, coreRadius, 0, Math.PI * 2);
        maskCtx.fill();

        for (let i = 0; i < SECONDARY_COUNT; i += 1) {
          const spread = (Math.PI * 2 * i) / SECONDARY_COUNT;
          const wobble = Math.sin(time * 0.0021 + i * 2.4) * 0.35;
          const blobAngle = angle + spread + wobble;
          const separation = SEP_MIN + intensity * (SEP_MAX - SEP_MIN);
          const radius = SECONDARY_MIN + intensity * (SECONDARY_MAX - SECONDARY_MIN);
          const bx = eased.x + Math.cos(blobAngle) * separation;
          const by = eased.y + Math.sin(blobAngle) * separation;
          maskCtx.beginPath();
          maskCtx.arc(bx, by, radius, 0, Math.PI * 2);
          maskCtx.fill();
        }
        maskCtx.filter = "none";
      }

      // 3) Composición -- foto nítida (nunca blur) recortada por la máscara.
      ctx.clearRect(0, 0, width, height);
      if (imageState.ready) {
        const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
        const drawW = img.naturalWidth * scale;
        const drawH = img.naturalHeight * scale;
        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(img, (width - drawW) / 2, (height - drawH) / 2, drawW, drawH);
        ctx.globalCompositeOperation = "destination-in";
        ctx.drawImage(maskCanvas, 0, 0, width, height);
        ctx.globalCompositeOperation = "source-over";
      }

      if (!addingRef.current && time > activeUntilRef.current) {
        stop();
      }
    };
    renderRef.current = render;

    return () => {
      renderRef.current = null;
      resizeObserver.disconnect();
      window.removeEventListener("resize", resize);
      subscribedRef.current?.();
      subscribedRef.current = null;
    };
  }, []);

  const shouldSkip = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType === "touch") return true;
    if (prefersReducedMotion()) return true;
    return false;
  };

  const ensureSubscribed = () => {
    if (subscribedRef.current) return;
    lastTickRef.current = 0;
    subscribedRef.current = subscribeFrame((time) => renderRef.current?.(time));
  };

  const updateTarget = (event: React.PointerEvent<HTMLElement>) => {
    const section = sectionRef.current;
    if (!section) return;
    const rect = section.getBoundingClientRect();
    targetRef.current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const onPointerEnter = (event: React.PointerEvent<HTMLElement>) => {
    if (shouldSkip(event)) return;
    updateTarget(event);
    easedRef.current.x = targetRef.current.x;
    easedRef.current.y = targetRef.current.y;
    easedRef.current.lastX = targetRef.current.x;
    easedRef.current.lastY = targetRef.current.y;
    addingRef.current = true;
    activeUntilRef.current = performance.now() + LINGER_MS;
    ensureSubscribed();
  };

  const onPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (shouldSkip(event)) return;
    updateTarget(event);
    addingRef.current = true;
    activeUntilRef.current = performance.now() + LINGER_MS;
    ensureSubscribed();
  };

  const onPointerLeave = (event: React.PointerEvent<HTMLElement>) => {
    if (shouldSkip(event)) return;
    addingRef.current = false;
  };

  return { sectionRef, canvasRef, onPointerEnter, onPointerMove, onPointerLeave };
}
