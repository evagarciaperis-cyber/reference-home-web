"use client";

import { useRef } from "react";
import gsap from "gsap";
import { prefersReducedMotion } from "../core/media";

// px -- tamaño base (óvalo suave, nunca un círculo perfecto ni en
// reposo: rx != ry ya en la forma de descanso) y techo por velocidad.
// 2026-08-19 (reducido -- la mancha anterior era demasiado grande):
// eje dominante hasta ~175px, eje secundario nunca baja de ~90px, tope
// absoluto 190px en cualquier eje.
const BASE_RX = 125;
const BASE_RY = 105;
const SIZE_BOOST_MAX = 35; // se suma solo al eje dominante: 125*1.12+35 = 175
const MAX_SIZE = 190; // tope absoluto, cualquier eje
const SCALE_MAX = 0.12; // deformación ±12%, simétrica (crece/encoge igual)
const ROTATE_MAX = 3; // deg
const SPEED_NORM = 1.4; // px/ms al que la deformación llega a intensidad 1
const IDLE_MS = 140;

type Handlers = {
  sectionRef: React.RefObject<HTMLElement | null>;
  onPointerEnter: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerLeave: (event: React.PointerEvent<HTMLElement>) => void;
};

type QuickFns = {
  moveX: gsap.QuickToFunc;
  moveY: gsap.QuickToFunc;
  growRx: gsap.QuickToFunc;
  growRy: gsap.QuickToFunc;
  spin: gsap.QuickToFunc;
};

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

/**
 * Mancha orgánica (óvalo pequeño con deformación por velocidad/dirección
 * + giro sutil) que sigue el cursor en TestSection y revela, vía
 * `clip-path: ellipse(...)` sobre una única `<img>` real (ver
 * TestSection.module.css -- 2026-08-19: eliminada la segunda copia
 * ampliada/desenfocada que antes vivía detrás, generaba un aro/corona
 * visible alrededor del recorte en vez de una mancha limpia), la imagen
 * oculta bajo el fondo blanco. CSS + GSAP únicamente -- sin WebGL, sin
 * canvas, sin SVG mask.
 *
 * Un único proxy plano (no el DOM) animado con cinco `gsap.quickTo`
 * (posición X/Y, radios X/Y, rotación) -- cada uno escribe su propia
 * custom property (--mask-x/--mask-y/--mask-rx/--mask-ry/--mask-rotate)
 * en el propio `<section>` dentro de su `onUpdate`. Nada de estado
 * React por frame, ningún requestAnimationFrame propio: los eventos
 * siguen siendo los onPointerEnter/Move/Leave de siempre, directamente
 * en el `<section>` (igual que antes de este hook).
 *
 * Velocidad: delta de posición entre pointermove normalizado por tiempo
 * transcurrido. La magnitud aumenta el tamaño (hasta MAX_SIZE); el sesgo
 * horizontal/vertical decide qué eje crece y cuál se contrae (nunca los
 * dos a la vez) y el signo/intensidad de ese sesgo da el giro. Sin
 * movimiento (IDLE_MS) vuelve sola a la forma de reposo (BASE_RX/RY, sin
 * rotación) -- la posición no se toca, se queda donde el cursor se paró.
 *
 * Dispositivos sin cursor real (hover:none) y prefers-reduced-motion: los
 * manejadores devueltos no hacen nada (early return) -- las variables se
 * quedan en su valor por defecto del CSS (radios en 0), así que el
 * bloque permanece estático sin depender de este hook para ese caso.
 */
export function useTestSectionRevealMotion(): Handlers {
  const sectionRef = useRef<HTMLElement>(null);
  const quickRef = useRef<QuickFns | null>(null);
  const lastRef = useRef({ x: 0, y: 0, t: 0 });
  const idleRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const shouldSkip = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType === "touch") return true;
    if (prefersReducedMotion()) return true;
    return false;
  };

  const ensureQuick = (section: HTMLElement): QuickFns => {
    if (quickRef.current) return quickRef.current;
    const proxy = { x: 0, y: 0, rx: 0, ry: 0, rotate: 0 };
    const set = (name: string, value: number, unit: string) => section.style.setProperty(name, `${value}${unit}`);
    const fns: QuickFns = {
      moveX: gsap.quickTo(proxy, "x", { duration: 0.5, ease: "power3", onUpdate: () => set("--mask-x", proxy.x, "px") }),
      moveY: gsap.quickTo(proxy, "y", { duration: 0.5, ease: "power3", onUpdate: () => set("--mask-y", proxy.y, "px") }),
      growRx: gsap.quickTo(proxy, "rx", { duration: 0.4, ease: "power2", onUpdate: () => set("--mask-rx", proxy.rx, "px") }),
      growRy: gsap.quickTo(proxy, "ry", { duration: 0.4, ease: "power2", onUpdate: () => set("--mask-ry", proxy.ry, "px") }),
      spin: gsap.quickTo(proxy, "rotate", {
        duration: 0.5,
        ease: "power2",
        onUpdate: () => set("--mask-rotate", proxy.rotate, "deg"),
      }),
    };
    quickRef.current = fns;
    return fns;
  };

  const settle = (fns: QuickFns) => {
    fns.growRx(BASE_RX);
    fns.growRy(BASE_RY);
    fns.spin(0);
  };

  const onPointerEnter = (event: React.PointerEvent<HTMLElement>) => {
    if (shouldSkip(event)) return;
    const section = sectionRef.current;
    if (!section) return;

    const rect = section.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    lastRef.current = { x, y, t: event.timeStamp };

    const fns = ensureQuick(section);
    // Posición: colocación inmediata (sin barrido desde el último punto
    // de una entrada anterior) -- solo el tamaño crece con suavidad.
    section.style.setProperty("--mask-x", `${x}px`);
    section.style.setProperty("--mask-y", `${y}px`);
    fns.moveX(x);
    fns.moveY(y);
    settle(fns);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (shouldSkip(event)) return;
    const section = sectionRef.current;
    if (!section) return;

    const fns = ensureQuick(section);
    const rect = section.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const last = lastRef.current;
    const dt = Math.max(1, event.timeStamp - last.t);
    const speedX = Math.abs(x - last.x) / dt;
    const speedY = Math.abs(y - last.y) / dt;
    const totalSpeed = speedX + speedY;
    const intensity = clamp(totalSpeed / SPEED_NORM, 0, 1);
    const bias = totalSpeed > 0.0001 ? (speedX - speedY) / totalSpeed : 0; // -1 (vertical) .. 1 (horizontal)

    // El boost por velocidad se suma solo al eje dominante (el que
    // crece); el eje perpendicular únicamente se contrae desde su propia
    // base -- así el eje secundario sí puede bajar hacia ~90px en vez de
    // quedar inflado por el mismo boost que el dominante.
    let rx: number;
    let ry: number;
    if (bias >= 0) {
      rx = BASE_RX * (1 + intensity * bias * SCALE_MAX) + intensity * bias * SIZE_BOOST_MAX;
      ry = BASE_RY * (1 - intensity * bias * SCALE_MAX);
    } else {
      const verticalBias = -bias;
      ry = BASE_RY * (1 + intensity * verticalBias * SCALE_MAX) + intensity * verticalBias * SIZE_BOOST_MAX;
      rx = BASE_RX * (1 - intensity * verticalBias * SCALE_MAX);
    }
    rx = clamp(rx, 0, MAX_SIZE);
    ry = clamp(ry, 0, MAX_SIZE);
    const rotate = clamp(bias * intensity * ROTATE_MAX, -ROTATE_MAX, ROTATE_MAX);

    fns.moveX(x);
    fns.moveY(y);
    fns.growRx(rx);
    fns.growRy(ry);
    fns.spin(rotate);

    lastRef.current = { x, y, t: event.timeStamp };

    window.clearTimeout(idleRef.current);
    idleRef.current = setTimeout(() => settle(fns), IDLE_MS);
  };

  const onPointerLeave = (event: React.PointerEvent<HTMLElement>) => {
    if (shouldSkip(event)) return;
    const section = sectionRef.current;
    if (!section) return;

    window.clearTimeout(idleRef.current);
    const fns = ensureQuick(section);
    fns.growRx(0);
    fns.growRy(0);
    fns.spin(0);
  };

  return { sectionRef, onPointerEnter, onPointerMove, onPointerLeave };
}
