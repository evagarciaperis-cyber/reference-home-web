"use client";

import { useEffect, type RefObject } from "react";
import { easeInOutCubic } from "../core/easing";
import { prefersReducedMotion } from "../core/media";

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type Refs = {
  sectionRef: RefObject<HTMLElement | null>;
};

// Recorrido del Hero, cuatro estados (revisión 2026-07-26 nº2, tras
// incorporar hero-tarde.png): día → tarde → atardecer → noche, con un
// tramo "estable" tras cada transición para poder contemplar cada estado.
// Ocho tramos sobre el progreso 0-1:
//   0.00-0.12  día estable
//   0.12-0.30  transición día → tarde
//   0.30-0.38  tarde estable
//   0.38-0.58  transición tarde → atardecer
//   0.58-0.66  atardecer estable
//   0.66-0.84  transición atardecer → noche
//   0.84-0.92  noche estable
//   0.92-1.00  salida progresiva hacia Manifesto
const STAGE = {
  dayEnd: 0.12,
  toTardeEnd: 0.3,
  tardeEnd: 0.38,
  toDuskEnd: 0.58,
  duskEnd: 0.66,
  toNightEnd: 0.84,
  nightEnd: 0.92,
};

function computeLayers(p: number) {
  // Regla dura: nunca más de DOS de las cuatro capas con opacidad
  // distinta de 0 a la vez -- las otras dos permanecen exactamente en 0.
  if (p <= STAGE.dayEnd) return { day: 1, tarde: 0, dusk: 0, night: 0 };
  if (p <= STAGE.toTardeEnd) {
    const t = easeInOutCubic((p - STAGE.dayEnd) / (STAGE.toTardeEnd - STAGE.dayEnd));
    return { day: 1 - t, tarde: t, dusk: 0, night: 0 };
  }
  if (p <= STAGE.tardeEnd) return { day: 0, tarde: 1, dusk: 0, night: 0 };
  if (p <= STAGE.toDuskEnd) {
    const t = easeInOutCubic((p - STAGE.tardeEnd) / (STAGE.toDuskEnd - STAGE.tardeEnd));
    return { day: 0, tarde: 1 - t, dusk: t, night: 0 };
  }
  if (p <= STAGE.duskEnd) return { day: 0, tarde: 0, dusk: 1, night: 0 };
  if (p <= STAGE.toNightEnd) {
    const t = easeInOutCubic((p - STAGE.duskEnd) / (STAGE.toNightEnd - STAGE.duskEnd));
    return { day: 0, tarde: 0, dusk: 1 - t, night: t };
  }
  return { day: 0, tarde: 0, dusk: 0, night: 1 };
}

// Trayectoria del sol (corrección 2026-07-26 nº6 -- reescrita para
// sincronizarse EXACTAMENTE con las cuatro fotografías definitivas, no con
// un recorrido propio). Usa los mismos límites de STAGE que computeLayers:
// se mueve solo durante los tramos de "transición" y se queda quieto
// durante los tramos "estables" -- así el sol nunca tiene un movimiento
// independiente del cambio de fotografía, están gobernados por el mismo
// progreso p con los mismos siete puntos de corte.
//
// Posiciones ancladas a evidencia, no a ojo:
// - Día: no hay sol visible en hero-dia.png (cielo azul uniforme) -- se
//   sitúa arriba y centrado, parcialmente fuera del encuadre, tal y como
//   se pidió explícitamente (no hay nada que medir, es una colocación
//   narrativa deliberada).
// - Tarde: hero-tarde.png tampoco tiene un disco solar distinguible, solo
//   un resplandor cálido difuso sobre el horizonte izquierdo -- se sitúa
//   en el tercio izquierdo, por encima del horizonte.
// - Atardecer: hero-atardecer.png SÍ tiene un resplandor solar claramente
//   localizable -- medido directamente (pico de brillo dentro de la franja
//   del horizonte, izquierda): x=11.8%, y=41.4%. La posición de "atardecer
//   estable" usa ese valor medido, no una estimación.
// - Noche: sin sol -- desaparece antes de que noche llegue a opacidad 1.
//
// Verificado que en ningún punto de este recorrido x supera ~50% mientras
// y es menor que la silueta real medida (scratch-new-silhouette.js): la
// silueta de casa/olivo en las fotografías nuevas no empieza hasta
// x≈40%, y el tramo x=40-50% del recorrido ocurre solo al principio de la
// transición día→tarde, con y todavía muy por encima (más arriba) de la
// silueta real en esa franja (~46-54%). Ver informe de cierre para el
// detalle numérico.
const SUN_KEYFRAMES = [
  { p: 0, x: 50, y: 4 }, // día: arriba, centrado, parcialmente fuera de encuadre
  { p: STAGE.dayEnd, x: 50, y: 4 }, // mantiene posición durante todo el tramo "día estable"
  { p: STAGE.toTardeEnd, x: 22, y: 30 }, // transición día→tarde: se desplaza a la izquierda y desciende
  { p: STAGE.tardeEnd, x: 22, y: 30 }, // mantiene posición durante "tarde estable"
  { p: STAGE.toDuskEnd, x: 11.8, y: 41.4 }, // transición tarde→atardecer: baja hacia el horizonte marino (posición medida)
  { p: STAGE.duskEnd, x: 11.8, y: 41.4 }, // mantiene posición durante "atardecer estable"
  { p: STAGE.toNightEnd, x: 10, y: 45 }, // transición atardecer→noche: desciende ligeramente bajo el horizonte
];

function sunPositionAt(p: number): { x: number; y: number } {
  if (p <= SUN_KEYFRAMES[0].p) return { x: SUN_KEYFRAMES[0].x, y: SUN_KEYFRAMES[0].y };
  for (let i = 0; i < SUN_KEYFRAMES.length - 1; i++) {
    const a = SUN_KEYFRAMES[i];
    const b = SUN_KEYFRAMES[i + 1];
    if (p >= a.p && p <= b.p) {
      const localT = b.p === a.p ? 0 : easeInOutCubic((p - a.p) / (b.p - a.p));
      return { x: lerp(a.x, b.x, localT), y: lerp(a.y, b.y, localT) };
    }
  }
  const last = SUN_KEYFRAMES[SUN_KEYFRAMES.length - 1];
  return { x: last.x, y: last.y };
}

// Envolvente de intensidad -- punto de partida pedido explícitamente
// (día 1.00 / tarde 0.82 / atardecer 0.68 / inicio de noche 0.00), no una
// obligación matemática exacta pero se respeta tal cual al no haber razón
// para alejarse de ella. Se apaga del todo ANTES de que acabe la
// transición atardecer→noche (al 70% de ese tramo), para que "desaparece
// completamente antes de que hero-noche.png alcance opacidad 1" se cumpla
// con margen, no en el límite exacto.
const SUN_INTENSITY = { day: 1.0, tarde: 0.88, atardecer: 0.74 };
const SUN_FADEOUT_FRACTION = 0.7; // del tramo atardecer→noche

function sunOpacityAt(p: number): number {
  if (p <= STAGE.dayEnd) return SUN_INTENSITY.day;
  if (p <= STAGE.toTardeEnd) {
    const t = easeInOutCubic((p - STAGE.dayEnd) / (STAGE.toTardeEnd - STAGE.dayEnd));
    return lerp(SUN_INTENSITY.day, SUN_INTENSITY.tarde, t);
  }
  if (p <= STAGE.tardeEnd) return SUN_INTENSITY.tarde;
  if (p <= STAGE.toDuskEnd) {
    const t = easeInOutCubic((p - STAGE.tardeEnd) / (STAGE.toDuskEnd - STAGE.tardeEnd));
    return lerp(SUN_INTENSITY.tarde, SUN_INTENSITY.atardecer, t);
  }
  if (p <= STAGE.duskEnd) return SUN_INTENSITY.atardecer;
  const fadeEndP = STAGE.duskEnd + (STAGE.toNightEnd - STAGE.duskEnd) * SUN_FADEOUT_FRACTION;
  if (p <= fadeEndP) {
    const t = easeInOutCubic((p - STAGE.duskEnd) / (fadeEndP - STAGE.duskEnd));
    return lerp(SUN_INTENSITY.atardecer, 0, t);
  }
  return 0;
}

function computeLight(p: number) {
  const pos = sunPositionAt(p);
  const opacity = sunOpacityAt(p);
  return { opacity, x: pos.x, y: pos.y };
}

// Temperatura atmosférica (corrección 2026-07-26 nº4): al acortar el
// recorrido del sol, el peso de "se nota que pasa el tiempo" tiene que
// recaer más en la atmósfera (el propio tono de la fotografía, reforzado)
// que en el desplazamiento del disco solar. Dos veladuras muy sutiles a
// pantalla completa, con mix-blend-mode: overlay -- una cálida (ámbar,
// crece hacia tarde/atardecer) y una fría (azul, crece hacia noche) --
// nunca las dos a la vez, y siempre "ligeras" (máximo ~0.16 de opacidad):
// esto es un acento sobre la fotografía real, no una regrading que la
// sustituya.
function computeAtmosphere(p: number) {
  let warm = 0;
  let cool = 0;

  if (p <= STAGE.dayEnd) {
    warm = 0;
  } else if (p <= STAGE.toTardeEnd) {
    warm = lerp(0, 0.08, (p - STAGE.dayEnd) / (STAGE.toTardeEnd - STAGE.dayEnd));
  } else if (p <= STAGE.tardeEnd) {
    warm = 0.08;
  } else if (p <= STAGE.toDuskEnd) {
    warm = lerp(0.08, 0.16, (p - STAGE.tardeEnd) / (STAGE.toDuskEnd - STAGE.tardeEnd));
  } else if (p <= STAGE.duskEnd) {
    warm = 0.16;
  } else if (p <= STAGE.toNightEnd) {
    warm = lerp(0.16, 0, (p - STAGE.duskEnd) / (STAGE.toNightEnd - STAGE.duskEnd));
  } else {
    warm = 0;
  }

  if (p <= STAGE.duskEnd) {
    cool = 0;
  } else if (p <= STAGE.toNightEnd) {
    cool = lerp(0, 0.13, (p - STAGE.duskEnd) / (STAGE.toNightEnd - STAGE.duskEnd));
  } else {
    cool = 0.13;
  }

  return { warm, cool };
}

/**
 * Hero (docs/HERO_REDESIGN_SPEC.md + correcciones 2026-07-26 y 2026-07-26
 * nº2). Mismo patrón de progreso de scroll que useWorkZoom/useBrandStory.
 * Cuatro capas de fondo en vez de tres desde la incorporación de
 * hero-tarde.png -- la función es suavizar la evolución de la luz, no
 * acelerar el recorrido (STAGE conserva las paradas "estables").
 */
export function useHero({ sectionRef }: Refs): void {
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    if (prefersReducedMotion()) return;

    let start = 0;
    let distance = 1;
    let frame = 0;

    const render = () => {
      frame = 0;
      const p = clamp((window.scrollY - start) / distance, 0, 1);

      const { day, tarde, dusk, night } = computeLayers(p);
      const light = computeLight(p);
      const atmosphere = computeAtmosphere(p);
      const exitOpacity = p <= STAGE.nightEnd ? 0 : easeInOutCubic((p - STAGE.nightEnd) / (1 - STAGE.nightEnd));

      section.style.setProperty("--hero-progress", p.toFixed(4));
      section.style.setProperty("--hero-day-opacity", day.toFixed(4));
      section.style.setProperty("--hero-tarde-opacity", tarde.toFixed(4));
      section.style.setProperty("--hero-dusk-opacity", dusk.toFixed(4));
      section.style.setProperty("--hero-night-opacity", night.toFixed(4));
      section.style.setProperty("--hero-light-x", light.x.toFixed(2) + "%");
      section.style.setProperty("--hero-light-y", light.y.toFixed(2) + "%");
      section.style.setProperty("--hero-light-opacity", light.opacity.toFixed(4));
      section.style.setProperty("--hero-warm-wash", atmosphere.warm.toFixed(4));
      section.style.setProperty("--hero-cool-wash", atmosphere.cool.toFixed(4));
      section.style.setProperty("--hero-exit-opacity", exitOpacity.toFixed(4));
    };

    const requestRender = () => {
      if (!frame) frame = requestAnimationFrame(render);
    };

    const measure = () => {
      start = window.scrollY + section.getBoundingClientRect().top;
      distance = Math.max(1, section.offsetHeight - window.innerHeight);
      requestRender();
    };

    window.addEventListener("scroll", requestRender, { passive: true });
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    document.fonts?.ready.then(measure).catch(() => {});

    const onLoad = () => measure();
    if (document.readyState === "complete") {
      onLoad();
    } else {
      window.addEventListener("load", onLoad, { once: true });
    }

    measure();

    return () => {
      window.removeEventListener("scroll", requestRender);
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      window.removeEventListener("load", onLoad);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [sectionRef]);
}
