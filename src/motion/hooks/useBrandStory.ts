"use client";

import { useEffect, type RefObject } from "react";
import { easeInOutCubic, easeOutCubic } from "../core/easing";
import { prefersReducedMotion } from "../core/media";

const DESKTOP_QUERY = "(min-width: 901px)";
const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

// Puerto literal de storySegments en main.js: rangos de progreso [0,1] en
// los que cada uno de los 3 brand-step entra/permanece/sale.
const STORY_SEGMENTS = [
  { start: 0.07, end: 0.38 },
  { start: 0.31, end: 0.65 },
  { start: 0.58, end: 0.87 },
];

type Refs = {
  sectionRef: RefObject<HTMLElement | null>;
  stickyRef: RefObject<HTMLElement | null>;
};

/**
 * Puerto literal del bloque "brandStory" de main.js: la secuencia
 * sticky con brújula que marca el recorrido narrativo "De la idea al
 * lanzamiento" a través de 3 pasos. Todos los selectores internos ya eran
 * atributos literales en el original (data-story-*), salvo
 * [data-story-route], nuevo, que sustituye a la clase .brand-story__route
 * (solo se usaba para medir, nunca para estilos dependientes del hook)
 * -- mismo criterio que [data-work-shade] en la fase 9. El estado
 * "activo" de cada paso, que el original alterna con
 * classList.toggle('is-active', ...), se expone aquí como
 * [data-step-active] en vez de una clase -- mismo criterio que
 * [data-immersed] en WorkZoom (fase 9): las clases de CSS Modules llevan
 * hash, así que el hook nunca podría referenciar el nombre literal
 * "is-active" que usaría el CSS.
 */
export function useBrandStory({ sectionRef, stickyRef }: Refs): void {
  useEffect(() => {
    const section = sectionRef.current;
    const sticky = stickyRef.current;
    if (!section || !sticky) return;

    const startWords = section.querySelector<HTMLElement>("[data-story-start]");
    const endWords = section.querySelector<HTMLElement>("[data-story-end]");
    const compass = section.querySelector<HTMLElement>("[data-story-compass]");
    const needle = section.querySelector<HTMLElement>("[data-story-needle]");
    const line = section.querySelector<HTMLElement>("[data-story-line]");
    const count = section.querySelector<HTMLElement>("[data-story-count]");
    const caption = section.querySelector<HTMLElement>("[data-story-caption]");
    const steps = Array.from(section.querySelectorAll<HTMLElement>("[data-story-step]"));
    const route = section.querySelector<HTMLElement>("[data-story-route]");
    const desktopQuery = window.matchMedia(DESKTOP_QUERY);
    const reduced = prefersReducedMotion();

    let storyStart = 0;
    let storyDistance = 1;
    let storyTravel = 1;
    let storyFrame = 0;

    const resetBrandStory = () => {
      section.style.removeProperty("--story-progress");
      section.removeAttribute("data-active");
      [startWords, endWords, compass, needle, line, caption].forEach((el) => el?.removeAttribute("style"));
      steps.forEach((step) => {
        step.removeAttribute("style");
        step.removeAttribute("data-step-active");
      });
      if (count) count.textContent = "01 / 03";
    };

    const renderBrandStory = () => {
      storyFrame = 0;
      if (!desktopQuery.matches || reduced) return;

      const p = clamp((window.scrollY - storyStart) / storyDistance, 0, 1);
      section.style.setProperty("--story-progress", p.toFixed(4));

      if (line) line.style.height = `${clamp(p * 1.04, 0, 1) * 100}%`;

      if (compass) {
        const compassEase = easeInOutCubic(clamp((p - 0.015) / 0.93, 0, 1));
        const y = storyTravel * (1 - compassEase);
        const scale = 0.72 + Math.sin(Math.PI * compassEase) * 0.18 + compassEase * 0.1;
        compass.style.transform = `translate3d(0,${y}px,0) scale(${scale}) rotate(${Math.sin(p * Math.PI * 4) * 2.2}deg)`;
        compass.style.opacity = String(1 - clamp((p - 0.94) / 0.06, 0, 1));
      }
      if (needle) needle.style.transform = `rotate(${p * 620 - 34}deg)`;

      const introOut = easeOutCubic(clamp((p - 0.04) / 0.27, 0, 1));
      if (startWords) {
        startWords.style.opacity = String(1 - introOut);
        startWords.style.transform = `translate3d(0,${-introOut * 15}vh,0) scale(${1 - introOut * 0.055})`;
      }

      const endingIn = easeOutCubic(clamp((p - 0.8) / 0.18, 0, 1));
      if (endWords) {
        endWords.style.opacity = String(endingIn);
        endWords.style.transform = `translate3d(0,${(1 - endingIn) * 12}vh,0) scale(${0.96 + endingIn * 0.04})`;
      }

      let activeIndex = 0;
      let activeOpacity = -1;
      steps.forEach((step, index) => {
        const segment = STORY_SEGMENTS[index];
        const enter = easeOutCubic(clamp((p - segment.start) / 0.085, 0, 1));
        const leave = easeOutCubic(clamp((p - (segment.end - 0.085)) / 0.085, 0, 1));
        let opacity = Math.min(enter, 1 - leave);
        if (index === 2) opacity *= 1 - clamp((p - 0.84) / 0.1, 0, 1);
        const y = (1 - enter) * 78 - leave * 78;
        const scale = 0.975 + opacity * 0.025;
        step.style.opacity = String(clamp(opacity, 0, 1));
        step.style.transform = `translate3d(0,${y}px,0) scale(${scale})`;
        step.style.pointerEvents = opacity > 0.82 ? "auto" : "none";
        step.toggleAttribute("data-step-active", opacity > 0.56);
        if (opacity > activeOpacity) {
          activeOpacity = opacity;
          activeIndex = index;
        }
      });

      // Cuando termina el tercer paso, mantenemos el indicador en 03
      // mientras aparece la frase final, en vez de volver visualmente a 01.
      const displayIndex = p > 0.875 ? 2 : p < 0.055 ? 0 : activeIndex;
      section.dataset.active = String(displayIndex);
      if (count) count.textContent = `${String(displayIndex + 1).padStart(2, "0")} / 03`;
      if (caption) caption.style.opacity = String(1 - clamp(p / 0.16, 0, 1));
    };

    const requestStoryRender = () => {
      if (!storyFrame) storyFrame = requestAnimationFrame(renderBrandStory);
    };

    const measureBrandStory = () => {
      if (!compass) return;
      if (!desktopQuery.matches || reduced) {
        resetBrandStory();
        return;
      }
      storyStart = window.scrollY + section.getBoundingClientRect().top;
      storyDistance = Math.max(1, section.offsetHeight - window.innerHeight);
      storyTravel = Math.max(0, (route?.clientHeight || window.innerHeight * 0.78) - compass.offsetHeight);
      requestStoryRender();
    };

    window.addEventListener("scroll", requestStoryRender, { passive: true });
    window.addEventListener("resize", measureBrandStory);
    window.addEventListener("orientationchange", measureBrandStory);
    desktopQuery.addEventListener?.("change", measureBrandStory);
    document.fonts?.ready.then(measureBrandStory).catch(() => {});

    const onLoad = () => measureBrandStory();
    if (document.readyState === "complete") {
      onLoad();
    } else {
      window.addEventListener("load", onLoad, { once: true });
    }

    let resizeObserver: ResizeObserver | undefined;
    if ("ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(measureBrandStory);
      resizeObserver.observe(sticky);
    }

    measureBrandStory();

    return () => {
      window.removeEventListener("scroll", requestStoryRender);
      window.removeEventListener("resize", measureBrandStory);
      window.removeEventListener("orientationchange", measureBrandStory);
      window.removeEventListener("load", onLoad);
      desktopQuery.removeEventListener?.("change", measureBrandStory);
      resizeObserver?.disconnect();
      if (storyFrame) cancelAnimationFrame(storyFrame);
    };
  }, [sectionRef, stickyRef]);
}
