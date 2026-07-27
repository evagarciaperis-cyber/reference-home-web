"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "../core/media";
import { HERO_NARRATIVE_VH } from "../core/heroGeometry";

// Arrastre amortiguado de la subida de Manifesto (corrección 2026-07-27,
// segunda revisión): NO es un muelle con rebote -- es un seguidor
// críticamente amortiguado (zeta=1 exacto). Zeta=1 es la frontera
// matemática exacta por debajo de la cual un sistema de 2º orden NUNCA
// puede sobrepasar su objetivo ni oscilar, así que "overshoot cero" no
// depende de ajustar bien los números -- está garantizado por la propia
// ecuación (resuelta de forma cerrada más abajo, no integrada paso a
// paso). La "sensación de goma" viene de OMEGA0 (más bajo = más lento en
// alcanzar el scroll, más arrastre perceptible, más recorrido tras
// soltar la rueda), no de reducir el amortiguamiento.
//
// Tres variantes probadas (empalme automático mediante la constante de
// abajo -- cambiar solo ese número):
//   A ligera:  OMEGA0 = 72  (~20-25px de arrastre en scroll normal, ~180ms de cola tras parar)
//   B media:   OMEGA0 = 50  (~35-40px de arrastre en scroll normal, ~250ms de cola tras parar)
//   C marcada: OMEGA0 = 38  (~50-55px de arrastre en scroll normal, ~320ms de cola tras parar)
const OMEGA0 = 50; // <- variante activa: B (media). Cambiar a 72 (A) o 38 (C) para probar las otras.

const SETTLE_EPSILON = 0.0008;

// Red de seguridad (se mantiene a petición expresa): por generoso que
// sea el arrastre de las tres variantes anteriores, un scroll sintético
// o un fling extremo podría en teoría alejar smoothProgress del target
// más de lo que cualquier scroll humano real produce. Este tope acota
// cuánto puede quedarse atrás en la propia escala de progreso (0-1),
// muy por encima de lo que cualquiera de las tres variantes necesita en
// uso normal, así que nunca se nota -- solo evita que, bajo un salto
// extremo, el borde de Manifesto se quede visiblemente por detrás de
// donde el Hero ya ha dejado de estar pinneado.
const MAX_LAG_FRACTION = 0.32; // ~290px sobre 900 -- variante C solo llega a ~0.22 (200px) en scroll rápido simulado

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Aplica un desplazamiento vertical (translateY puro, nunca escala ni
 * skew -- el borde superior de la sección se mantiene recto) a Manifesto.
 *
 * Geometría (ver heroGeometry.ts): el contenedor del Hero mide
 * HERO_TOTAL_VH viewports, uno más de lo que necesitan la narrativa
 * (HERO_NARRATIVE_VH) y el tramo de cola (HERO_TAIL_VH) juntos -- ese
 * viewport de sobra es lo que mantiene el sticky del Hero pinneado hasta
 * que Manifesto lo ha cubierto del todo. Efecto colateral: el flujo
 * NATURAL de Manifesto (sin ningún transform) solo llega a top:0 al
 * final de ese contenedor más largo, no al final del tramo de cola. Este
 * hook no se limita a suavizar un 0-1 sobre ese flujo natural -- calcula
 * en cada frame la posición REAL que debería verse (desiredTopY, función
 * únicamente del progreso ya suavizado) y la posición que el flujo
 * natural produciría en ese scrollY (naturalTopY), y aplica exactamente
 * la diferencia. Por construcción, la posición mostrada es siempre
 * `desiredTopY` sin importar cuánto se haya alargado el contenedor por
 * detrás -- el Hero, mientras tanto, no se mueve en absoluto (se
 * mantiene sticky durante toda esta ventana, verificado por medición).
 */
export function useManifestoRise<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    const hero = document.getElementById("inicio");
    if (!el || !hero || prefersReducedMotion()) return;

    let smoothProgress = 0;
    let velocity = 0;
    let frame = 0;
    let lastTs = 0;

    const geometry = () => {
      const heroRect = hero!.getBoundingClientRect();
      const heroDocTop = window.scrollY + heroRect.top;
      const viewportHeight = window.innerHeight;
      const wipeStart = heroDocTop + HERO_NARRATIVE_VH * viewportHeight;
      // Fondo real del contenedor del Hero: donde Manifesto llega de
      // forma natural (sin transform) a top:0. Medido en vivo con
      // heroRect.height en vez de derivarlo también de las constantes,
      // para seguir siendo exacto ante cualquier redondeo/breakpoint.
      const outerBottom = heroDocTop + heroRect.height;
      return { viewportHeight, wipeStart, outerBottom };
    };

    const applyOffset = (offsetPx: number) => {
      el!.style.transform = Math.abs(offsetPx) > 0.05 ? `translateY(${offsetPx.toFixed(2)}px)` : "";
    };

    const step = (ts: number) => {
      frame = 0;
      const { viewportHeight, wipeStart, outerBottom } = geometry();
      const scrollY = window.scrollY;

      if (scrollY < wipeStart - 1) {
        // Por debajo del tramo: Manifesto está de sobra fuera del
        // viewport pase lo que pase -- sin transform, sin coste de
        // cálculo por frame.
        applyOffset(0);
        return;
      }

      const target = clamp((scrollY - wipeStart) / viewportHeight, 0, 1);
      const dt = lastTs ? Math.min((ts - lastTs) / 1000, 1 / 30) : 1 / 60;
      lastTs = ts;

      // Solución cerrada exacta del amortiguamiento crítico (no Euler
      // integrado paso a paso): con OMEGA0 alto, un paso de Euler normal
      // (velocity += force*dt; x += velocity*dt) es NUMÉRICAMENTE
      // INESTABLE a 60fps -- se comprobó en la práctica: el "muelle"
      // oscilaba sin asentarse nunca, entre valores que se alejaban cada
      // vez más del objetivo en vez de converger. Esta fórmula (estándar
      // para amortiguamiento crítico, target constante durante el propio
      // frame) es exacta y estable pase lo que pase con dt u OMEGA0.
      const err0 = smoothProgress - target;
      const decay = Math.exp(-OMEGA0 * dt);
      const newErr = (err0 + (velocity + OMEGA0 * err0) * dt) * decay;
      const newVelocity = (velocity - OMEGA0 * dt * (velocity + OMEGA0 * err0)) * decay;
      smoothProgress = target + newErr;
      velocity = newVelocity;
      // Red de seguridad: nunca más de MAX_LAG_FRACTION por detrás del
      // objetivo real, pase lo que pase con el scroll.
      smoothProgress = clamp(smoothProgress, target - MAX_LAG_FRACTION, target + MAX_LAG_FRACTION);

      // scrollY tope en outerBottom: pasado ese punto el flujo natural de
      // Manifesto ya no puede "adelantarse" más (ha llegado del todo a
      // top:0), así que la posición natural se satura ahí en vez de
      // seguir restando de más si el usuario sigue haciendo scroll dentro
      // del propio contenido de Manifesto.
      const naturalTopY = outerBottom - Math.min(scrollY, outerBottom);
      const desiredTopY = viewportHeight * (1 - smoothProgress);
      applyOffset(desiredTopY - naturalTopY);

      const isSettled = Math.abs(target - smoothProgress) < SETTLE_EPSILON && Math.abs(velocity) < SETTLE_EPSILON;
      if (isSettled) {
        // Asentado -- ya sea a mitad de ventana (el usuario dejó de
        // hacer scroll a medio tramo) o al final (scrollY >= outerBottom,
        // donde el offset final es exactamente 0 por construcción). El
        // offset ya aplicado arriba es el correcto; solo hace falta dejar
        // de computar hasta el próximo scroll.
        smoothProgress = target;
        velocity = 0;
        return;
      }
      frame = requestAnimationFrame(step);
    };

    const wake = () => {
      if (frame) return;
      lastTs = 0;
      frame = requestAnimationFrame(step);
    };

    // Estado inicial correcto sin esperar al primer evento de scroll.
    const initial = geometry();
    smoothProgress = clamp((window.scrollY - initial.wipeStart) / initial.viewportHeight, 0, 1);

    window.addEventListener("scroll", wake, { passive: true });
    wake();

    return () => {
      window.removeEventListener("scroll", wake);
      if (frame) cancelAnimationFrame(frame);
      el.style.transform = "";
    };
  }, []);

  return ref;
}
