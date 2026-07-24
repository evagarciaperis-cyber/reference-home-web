"use client";

import { useEffect, type RefObject } from "react";
import { prefersReducedMotion } from "../core/media";

const DESKTOP_QUERY = "(min-width: 901px)";
const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

type Refs = {
  sectionRef: RefObject<HTMLElement | null>;
  trackRef: RefObject<HTMLElement | null>;
  viewportRef: RefObject<HTMLElement | null>;
};

/**
 * Puerto literal del bloque "horizontalSection" de main.js: la galería de
 * proyectos con scroll horizontal sticky. Manipula el DOM directamente
 * (transform, custom properties, textContent) en cada frame, igual que el
 * original -- ahí está el coste de rendimiento que el original evita a
 * propósito; pasar esto por estado de React en cada scroll sería
 * reinterpretar el mecanismo, no portarlo (regla nº2/5 de la Fase 7).
 *
 * Selectores: [data-horizontal-section] y [data-horizontal-track] son
 * atributos literales que ya existían en el original (no clases), así que
 * se reutilizan tal cual. .projects__viewport, .project-card y
 * .projects__progress b sí eran selectores de clase -- CSS Modules les
 * cambia el nombre, así que aquí se sustituyen por
 * [data-horizontal-viewport], [data-project-card] y
 * [data-project-progress-bar] (mismo patrón que data-loop-anim,
 * data-header-tone, data-word de fases anteriores). [data-project-current]
 * también era ya un atributo literal en el original.
 */
export function useHorizontalGallery({ sectionRef, trackRef, viewportRef }: Refs): void {
  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    const viewport = viewportRef.current;
    if (!section || !track || !viewport) return;

    const cards = Array.from(track.querySelectorAll<HTMLElement>("[data-project-card]"));
    const projectCurrent = section.querySelector<HTMLElement>("[data-project-current]");
    const progressBar = section.querySelector<HTMLElement>("[data-project-progress-bar]");
    const desktopHorizontal = window.matchMedia(DESKTOP_QUERY);
    const reduced = prefersReducedMotion();

    let horizontalStart = 0;
    let horizontalDistance = 1;
    let horizontalMaxX = 0;
    let horizontalFrame = 0;
    let measureFrame = 0;

    const resetHorizontal = () => {
      section.style.removeProperty("--projects-scroll-height");
      track.style.transform = "";
      if (progressBar) progressBar.style.width = "";
      if (projectCurrent) projectCurrent.textContent = "01";
      cards.forEach((card) => {
        card.style.removeProperty("--card-scale");
        card.querySelector<HTMLElement>("img")?.style.removeProperty("--image-scale");
      });
    };

    const renderHorizontal = () => {
      horizontalFrame = 0;
      if (!desktopHorizontal.matches || reduced) return;

      const progressValue = clamp((window.scrollY - horizontalStart) / horizontalDistance, 0, 1);
      track.style.transform = `translate3d(${-progressValue * horizontalMaxX}px,0,0)`;

      if (progressBar) progressBar.style.width = `${progressValue * 100}%`;
      if (projectCurrent) {
        const totalCards = Math.max(1, cards.length);
        projectCurrent.textContent = String(Math.min(totalCards, Math.floor(progressValue * totalCards) + 1)).padStart(
          2,
          "0",
        );
      }

      const viewportRect = viewport.getBoundingClientRect();
      const viewportCenter = viewportRect.left + viewportRect.width / 2;
      const influence = Math.max(viewportRect.width * 0.72, 520);

      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.left + rect.width / 2;
        const proximity = 1 - clamp(Math.abs(cardCenter - viewportCenter) / influence, 0, 1);
        card.style.setProperty("--card-scale", (0.91 + proximity * 0.09).toFixed(3));
        card.querySelector<HTMLElement>("img")?.style.setProperty("--image-scale", (1.12 - proximity * 0.1).toFixed(3));
      });
    };

    const requestHorizontalRender = () => {
      if (!horizontalFrame) horizontalFrame = requestAnimationFrame(renderHorizontal);
    };

    const measureHorizontal = () => {
      if (!desktopHorizontal.matches || reduced) {
        resetHorizontal();
        return;
      }

      track.style.transform = "translate3d(0,0,0)";
      horizontalMaxX = Math.max(0, track.scrollWidth - viewport.clientWidth + 30);

      // La altura se calcula a partir del recorrido horizontal real. Así la
      // sección permanece fijada exactamente el tiempo necesario,
      // independientemente de pantalla o contenido.
      const scrollTravel = Math.max(horizontalMaxX + window.innerHeight * 0.55, window.innerHeight * 1.8);
      section.style.setProperty("--projects-scroll-height", `${Math.ceil(window.innerHeight + scrollTravel)}px`);

      measureFrame = requestAnimationFrame(() => {
        horizontalStart = window.scrollY + section.getBoundingClientRect().top;
        horizontalDistance = Math.max(1, section.offsetHeight - window.innerHeight);
        requestHorizontalRender();
      });
    };

    window.addEventListener("scroll", requestHorizontalRender, { passive: true });
    window.addEventListener("resize", measureHorizontal);
    window.addEventListener("orientationchange", measureHorizontal);
    desktopHorizontal.addEventListener?.("change", measureHorizontal);
    document.fonts?.ready.then(measureHorizontal).catch(() => {});

    // A diferencia del script estático original (siempre registrado antes
    // del evento `load`), un componente React puede montarse después de que
    // `load` ya haya ocurrido -- mismo fallback que usePreloader (fase 2).
    const onLoad = () => measureHorizontal();
    if (document.readyState === "complete") {
      onLoad();
    } else {
      window.addEventListener("load", onLoad, { once: true });
    }

    let resizeObserver: ResizeObserver | undefined;
    if ("ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(measureHorizontal);
      resizeObserver.observe(track);
    }

    measureHorizontal();

    return () => {
      window.removeEventListener("scroll", requestHorizontalRender);
      window.removeEventListener("resize", measureHorizontal);
      window.removeEventListener("orientationchange", measureHorizontal);
      window.removeEventListener("load", onLoad);
      desktopHorizontal.removeEventListener?.("change", measureHorizontal);
      resizeObserver?.disconnect();
      if (horizontalFrame) cancelAnimationFrame(horizontalFrame);
      if (measureFrame) cancelAnimationFrame(measureFrame);
    };
  }, [sectionRef, trackRef, viewportRef]);
}
