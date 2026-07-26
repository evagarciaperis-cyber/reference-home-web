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

// Resplandor (corrección 2026-07-26 nº2): verificado por muestreo de color
// directo sobre las cuatro fotografías que el calor SIEMPRE aparece sobre
// el horizonte izquierdo (mar), nunca en el cuadrante superior-derecho
// donde está la cubierta -- en las cuatro imágenes ese cielo se mantiene
// frío/neutro. Por eso el resplandor NO recorre la escena de derecha a
// izquierda: nace y muere prácticamente en el mismo sitio (horizonte,
// izquierda), lejos de la casa, y lo único que cambia de verdad es su
// intensidad. Esto satisface a la vez "nunca pasa por encima de la casa"
// y "el protagonista es el cambio de luz, no el movimiento del sol".
function computeLight(p: number) {
  let opacity: number;
  if (p <= STAGE.dayEnd) {
    opacity = 0; // sin sol visible de día (spec: luz entendida, no vista)
  } else if (p <= STAGE.toTardeEnd) {
    opacity = lerp(0, 0.35, (p - STAGE.dayEnd) / (STAGE.toTardeEnd - STAGE.dayEnd));
  } else if (p <= STAGE.tardeEnd) {
    opacity = 0.35;
  } else if (p <= STAGE.toDuskEnd) {
    opacity = lerp(0.35, 0.78, (p - STAGE.tardeEnd) / (STAGE.toDuskEnd - STAGE.tardeEnd));
  } else if (p <= STAGE.duskEnd) {
    opacity = 0.78;
  } else if (p <= STAGE.toNightEnd) {
    // Pierde presencia progresivamente -- no se convierte en luna.
    opacity = lerp(0.78, 0.14, (p - STAGE.duskEnd) / (STAGE.toNightEnd - STAGE.duskEnd));
  } else {
    opacity = 0.14;
  }

  const eased = easeInOutCubic(clamp(p / STAGE.nightEnd, 0, 1));
  // Desplazamiento mínimo y lento -- unos pocos puntos, siempre sobre el
  // mar (izquierda), nunca cruza hacia la mitad derecha donde está la casa.
  const x = lerp(16, 10, eased);
  const y = lerp(56, 58, eased);

  return { opacity, x, y };
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
      const exitOpacity = p <= STAGE.nightEnd ? 0 : easeInOutCubic((p - STAGE.nightEnd) / (1 - STAGE.nightEnd));

      section.style.setProperty("--hero-progress", p.toFixed(4));
      section.style.setProperty("--hero-day-opacity", day.toFixed(4));
      section.style.setProperty("--hero-tarde-opacity", tarde.toFixed(4));
      section.style.setProperty("--hero-dusk-opacity", dusk.toFixed(4));
      section.style.setProperty("--hero-night-opacity", night.toFixed(4));
      section.style.setProperty("--hero-light-x", light.x.toFixed(2) + "%");
      section.style.setProperty("--hero-light-y", light.y.toFixed(2) + "%");
      section.style.setProperty("--hero-light-opacity", light.opacity.toFixed(4));
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
