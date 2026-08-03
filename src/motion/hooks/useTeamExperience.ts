"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion, canHover } from "../core/media";
import { subscribeFrame } from "../core/frameTicker";
import { requestHeaderToneRefresh } from "../core/events";
import { useTeamPortraitScene } from "../webgl/useTeamPortraitScene";

let pluginRegistered = false;

const DESKTOP_QUERY = "(min-width: 901px)";
const PERSON_COUNT = 6;

// Reparto del progreso (self.progress, 0-1) sobre un pin de 750% de
// scroll (dentro del 650-850% pedido): 8% introducción, 6 x 13% por
// persona (13% de 750% = 97.5% de scroll cada una, dentro del 80-110%
// pedido), 10% para que el mosaico final se monte + pausa, 4% para la
// frase de cierre + CTA.
const TOTAL_SCROLL = "+=750%";
const INTRO_END = 0.08;
const PERSON_SPAN = 0.13;
const PORTRAITS_END = INTRO_END + PERSON_COUNT * PERSON_SPAN; // 0.86
const MOSAIC_END = 0.96;

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);
const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

type Handle = {
  sectionRef: React.RefObject<HTMLElement | null>;
  canvasHostRef: React.RefObject<HTMLDivElement | null>;
};

/**
 * Experiencia cinematográfica "Nuestro equipo" (2026-08-21) -- pin real
 * de GSAP ScrollTrigger (igual que Process/useProcess.ts) sobre un tramo
 * de scroll largo (TOTAL_SCROLL) que atraviesa 6 retratos individuales
 * más una composición final. A diferencia de Process (pocas fases,
 * autoría explícita con tl.to() por fase), aquí las fases se repiten 6
 * veces con la misma forma -- en vez de escribir ~30 tweens casi
 * idénticos, se usa UN ScrollTrigger con onUpdate y una función
 * `render(progress)` puramente procedural (mismo espíritu que el
 * useWorkZoom.ts anterior a esta ronda, que ya calculaba todo a mano a
 * partir de un progreso 0-1) que decide en cada frame qué persona está
 * activa, cuánto llevan de transición, opacidades de texto, uniforms de
 * Three.js, etc. Sigue siendo GSAP ScrollTrigger quien controla el pin y
 * el scrub (scrub:1) -- onUpdate es la forma estándar de leer ese
 * progreso ya suavizado, no un mecanismo paralelo.
 *
 * La escena Three.js (useTeamPortraitScene.ts, construida sobre
 * useThreeScene.ts) vive DENTRO de este hook -- WorkZoom.tsx solo pide
 * este único hook, igual que TestSection solo pide
 * useTestSectionFluidReveal.ts. El DOM (textos, mosaico final, CTA) se
 * selecciona por atributo `data-team-*`, mismo criterio que Process.
 *
 * Desactivado por completo (sin pin, sin Three.js, contenido visible tal
 * cual el CSS lo deja) en prefers-reduced-motion y por debajo de 901px
 * (DESKTOP_QUERY, mismo criterio que el resto del proyecto) -- ver
 * WorkZoom.module.css para el flujo vertical estático que cubre ambos
 * casos.
 */
export function useTeamExperience(imageSources: string[], fallbackSrc: string): Handle {
  const sectionRef = useRef<HTMLElement>(null);
  const scene = useTeamPortraitScene(imageSources, fallbackSrc);

  // Reactivo aparte (no dentro del efecto de una sola vez de abajo):
  // `scene.supported` lo decide de forma asíncrona useThreeScene (el
  // WebGLRenderer se intenta crear dentro de SU PROPIO efecto), así que
  // en el primer render todavía vale false aunque WebGL sí esté
  // disponible -- este pequeño efecto sí depende de ese valor para
  // reflejarlo en el DOM en cuanto cambie (ver WorkZoom.module.css,
  // fallback a la imagen plana si nunca llega a ponerse a true).
  useEffect(() => {
    sectionRef.current?.toggleAttribute("data-webgl-supported", scene.supported);
  }, [scene.supported]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    if (prefersReducedMotion()) return;
    if (!window.matchMedia(DESKTOP_QUERY).matches) return;

    if (!pluginRegistered) {
      gsap.registerPlugin(ScrollTrigger);
      pluginRegistered = true;
    }

    const intro = section.querySelector<HTMLElement>("[data-team-intro]");
    const persons = Array.from(section.querySelectorAll<HTMLElement>("[data-team-person]"));
    const dots = Array.from(section.querySelectorAll<HTMLElement>("[data-team-dot]"));
    const final = section.querySelector<HTMLElement>("[data-team-final]");
    const cta = section.querySelector<HTMLElement>("[data-team-cta]");
    const stage = scene.containerRef.current;

    if (!intro || persons.length !== PERSON_COUNT || dots.length !== PERSON_COUNT || !final || !cta || !stage) {
      return;
    }

    gsap.set(intro, { opacity: 0 });
    gsap.set(persons, { opacity: 0 });
    gsap.set(final, { opacity: 0 });
    gsap.set(cta, { opacity: 0 });

    let phase: "intro" | "portraits" | "final" = "intro";
    const setPhase = (next: typeof phase) => {
      if (phase === next) return;
      phase = next;
      section.dataset.teamPhase = next;
      // Header: crema en la introducción (sin marcar oscuro, mismo
      // criterio "ausencia = claro" que Process), oscuro durante los
      // retratos y la composición final (fondo oscuro en ambas). Un solo
      // atributo, el mismo sistema centralizado de siempre.
      if (next === "intro") section.removeAttribute("data-header-tone");
      else section.setAttribute("data-header-tone", "dark");
      requestHeaderToneRefresh();
    };

    const render = (progress: number) => {
      const introOpacity =
        smoothstep(0, 0.03, progress) * (1 - smoothstep(INTRO_END - 0.02, INTRO_END, progress));
      intro.style.opacity = String(introOpacity);
      intro.style.pointerEvents = introOpacity > 0.5 ? "auto" : "none";

      if (progress < INTRO_END) {
        setPhase("intro");
        stage.style.opacity = "0";
        final.style.opacity = "0";
        cta.style.opacity = "0";
        persons.forEach((el) => {
          el.style.opacity = "0";
          el.style.pointerEvents = "none";
        });
        dots.forEach((dot) => dot.removeAttribute("data-active"));
        return;
      }

      if (progress < PORTRAITS_END) {
        setPhase("portraits");
        const localP = clamp((progress - INTRO_END) / (PERSON_COUNT * PERSON_SPAN), 0, 1);
        const personFloat = localP * PERSON_COUNT;
        const idx = Math.min(PERSON_COUNT - 1, Math.floor(personFloat));
        const t = personFloat - idx;
        const nextIdx = Math.min(PERSON_COUNT - 1, idx + 1);
        const mix = idx === nextIdx ? 0 : smoothstep(0.7, 1, t);
        // "Bump" de desenfoque centrado en el tramo de transición (t
        // 0.68-1.0, pico ~0.85 -- coincide con mix=0.5): fuera de ahí,
        // foco completo.
        const blurBump = smoothstep(0.68, 0.85, t) - smoothstep(0.85, 1, t);
        const focus = 1 - blurBump;

        persons.forEach((el, i) => {
          let opacity = 0;
          let restY = 10;
          if (i === idx) {
            const textIn = smoothstep(0, 0.12, t);
            const textOut = 1 - smoothstep(0.62, 0.8, t);
            opacity = textIn * textOut;
            restY = (1 - textIn) * 14;
          }
          el.style.opacity = String(opacity);
          el.style.transform = `translate3d(0,${restY}px,0)`;
          el.style.pointerEvents = opacity > 0.6 ? "auto" : "none";
        });

        dots.forEach((dot, i) => dot.toggleAttribute("data-active", i === idx));
        section.dataset.teamAlign = persons[idx].dataset.align ?? "left";

        scene.setActive(idx, nextIdx, mix);
        scene.setFocus(focus);

        stage.style.opacity = "1";
        final.style.opacity = "0";
        cta.style.opacity = "0";
        return;
      }

      setPhase("final");
      const stageP = 1 - smoothstep(PORTRAITS_END, PORTRAITS_END + 0.05, progress);
      stage.style.opacity = String(stageP);
      const finalP = smoothstep(PORTRAITS_END, MOSAIC_END, progress);
      final.style.opacity = String(finalP);
      final.style.transform = `translate3d(0,${(1 - finalP) * 24}px,0)`;
      const ctaP = smoothstep(MOSAIC_END, 1, progress);
      cta.style.opacity = String(ctaP);
      cta.style.pointerEvents = ctaP > 0.5 ? "auto" : "none";

      persons.forEach((el) => {
        el.style.opacity = "0";
        el.style.pointerEvents = "none";
      });
      dots.forEach((dot) => dot.removeAttribute("data-active"));

      // Último retrato congelado (sin más crossfade) detrás del fundido
      // de salida del stage -- nunca se queda a medio mezclar.
      scene.setActive(PERSON_COUNT - 1, PERSON_COUNT - 1, 0);
      scene.setFocus(1);
    };

    const st = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: TOTAL_SCROLL,
      scrub: 1,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => render(self.progress),
    });

    render(0);
    scene.start();

    // Paralaje de cursor -- únicamente puntero fino (canHover(), mismo
    // helper que ya usa el resto del proyecto para excluir táctil); la
    // inercia real hacia este objetivo la aplica useTeamPortraitScene
    // cada frame, aquí solo se fija el objetivo normalizado -1..1.
    const pointerActive = canHover();
    const handlePointerMove = (event: PointerEvent) => {
      const rect = section.getBoundingClientRect();
      const x = clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
      const y = clamp(((event.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
      scene.setParallaxTarget(x, y);
    };
    const handlePointerLeave = () => scene.setParallaxTarget(0, 0);
    if (pointerActive) {
      section.addEventListener("pointermove", handlePointerMove);
      section.addEventListener("pointerleave", handlePointerLeave);
    }

    const unsubscribe = subscribeFrame(() => ScrollTrigger.update());

    return () => {
      unsubscribe();
      if (pointerActive) {
        section.removeEventListener("pointermove", handlePointerMove);
        section.removeEventListener("pointerleave", handlePointerLeave);
      }
      scene.stop();
      st.kill();
      section.removeAttribute("data-header-tone");
      section.removeAttribute("data-team-phase");
      section.removeAttribute("data-team-align");
      requestHeaderToneRefresh();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { sectionRef, canvasHostRef: scene.containerRef };
}
