"use client";

import { useEffect, type RefObject } from "react";
import { easeInOutCubic, easeOutCubic } from "../core/easing";
import { requestHeaderToneRefresh } from "../core/events";
import { prefersReducedMotion } from "../core/media";

const DESKTOP_QUERY = "(min-width: 901px)";
const IMMERSION_THRESHOLD = 0.57;
const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

type Refs = {
  sectionRef: RefObject<HTMLElement | null>;
};

/**
 * Puerto literal del bloque "workZoom" de main.js: la sección que hace
 * zoom sobre una pantalla de dispositivo hasta llenar el viewport. La
 * mayoría de selectores internos ([data-work-device], [data-work-screen],
 * [data-work-heading], [data-work-detail], [data-work-scroll]) ya eran
 * atributos literales en el original, no clases -- se reutilizan tal cual,
 * sin necesidad de convención data-* nueva (a diferencia de ProjectsGallery,
 * fase 7, donde varios selectores sí eran clases de CSS Modules). La única
 * excepción es el degradado ".work-device__shade" (sí era clase en el
 * original): se añade [data-work-shade] siguiendo el mismo criterio que
 * [data-project-card] en la fase 7.
 *
 * data-header-tone se añade/quita en el propio elemento de sección solo
 * mientras está "inmersa" (progreso > .57) -- caso especial ya anticipado
 * en useHeaderState (fase 3): esta sección decide cuándo es "oscura", el
 * header no sabe nada de ella. requestHeaderToneRefresh() replica la
 * llamada explícita a updateHeader() del original dentro de
 * renderWorkZoom(), para que el header reaccione en el mismo frame en que
 * cambia la inmersión, no en el próximo scroll.
 */
export function useWorkZoom({ sectionRef }: Refs): void {
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const device = section.querySelector<HTMLElement>("[data-work-device]");
    const screen = section.querySelector<HTMLElement>("[data-work-screen]");
    const heading = section.querySelector<HTMLElement>("[data-work-heading]");
    const detail = section.querySelector<HTMLElement>("[data-work-detail]");
    const scrollHint = section.querySelector<HTMLElement>("[data-work-scroll]");
    const desktopQuery = window.matchMedia(DESKTOP_QUERY);
    const reduced = prefersReducedMotion();

    let workStart = 0;
    let workDistance = 1;
    let workTargetScale = 1.8;
    let workFrame = 0;
    let isImmersed = false;

    const setImmersed = (next: boolean) => {
      if (isImmersed === next) return;
      isImmersed = next;
      section.toggleAttribute("data-immersed", next);
      if (next) {
        section.setAttribute("data-header-tone", "dark");
      } else {
        section.removeAttribute("data-header-tone");
      }
      requestHeaderToneRefresh();
    };

    const resetWorkZoom = () => {
      section.style.removeProperty("--work-progress");
      section.style.removeProperty("--work-ambient-scale");
      section.style.removeProperty("--work-ambient-opacity");
      setImmersed(false);
      if (device) device.style.transform = "";
      const image = screen?.querySelector<HTMLElement>("img");
      image?.style.removeProperty("transform");
      if (heading) {
        heading.style.opacity = "";
        heading.style.transform = "";
      }
      if (detail) {
        detail.style.opacity = "";
        detail.style.transform = "";
        detail.style.pointerEvents = "";
      }
      if (scrollHint) scrollHint.style.opacity = "";
    };

    const renderWorkZoom = () => {
      workFrame = 0;
      if (!device || !desktopQuery.matches || reduced) return;

      const p = clamp((window.scrollY - workStart) / workDistance, 0, 1);
      section.style.setProperty("--work-progress", p.toFixed(4));
      section.style.setProperty("--work-ambient-scale", (1 + p * 0.35).toFixed(4));
      section.style.setProperty("--work-ambient-opacity", (1 - p * 0.75).toFixed(4));

      const zoomP = easeInOutCubic(clamp((p - 0.08) / 0.68, 0, 1));
      const startScale = 0.235;
      const scale = startScale + (workTargetScale - startScale) * zoomP;
      const translateY = 24 - zoomP * 24;
      const rotateX = 5.5 * (1 - zoomP);
      device.style.transform = `translate3d(0,${translateY}vh,0) rotateX(${rotateX}deg) scale(${scale})`;

      const headingP = easeOutCubic(clamp((p - 0.02) / 0.35, 0, 1));
      if (heading) {
        heading.style.opacity = String(1 - headingP);
        heading.style.transform = `translate3d(0,${-headingP * 14}vh,0) scale(${1 - headingP * 0.08})`;
      }

      const imageP = clamp((p - 0.58) / 0.42, 0, 1);
      if (screen) {
        const image = screen.querySelector<HTMLElement>("img");
        if (image) {
          image.style.transform = `scale(${1.035 + imageP * 0.09}) translate3d(${imageP * -1.5}%,${imageP * -2.5}%,0)`;
        }
        const shade = screen.querySelector<HTMLElement>("[data-work-shade]");
        if (shade) shade.style.opacity = String(clamp((p - 0.68) / 0.18, 0, 0.82));
      }

      const detailP = easeOutCubic(clamp((p - 0.73) / 0.2, 0, 1));
      if (detail) {
        detail.style.opacity = String(detailP);
        detail.style.transform = `translate3d(0,${(1 - detailP) * 38}px,0)`;
        detail.style.pointerEvents = detailP > 0.85 ? "auto" : "none";
      }
      if (scrollHint) scrollHint.style.opacity = String(1 - clamp(p / 0.22, 0, 1));

      setImmersed(p > IMMERSION_THRESHOLD);
    };

    const requestWorkRender = () => {
      if (!workFrame) workFrame = requestAnimationFrame(renderWorkZoom);
    };

    const measureWorkZoom = () => {
      if (!device || !screen) return;
      if (!desktopQuery.matches || reduced) {
        resetWorkZoom();
        return;
      }
      device.style.transform = "none";
      const screenWidth = screen.offsetWidth || 1;
      const screenHeight = screen.offsetHeight || 1;
      workTargetScale = Math.max(window.innerWidth / screenWidth, window.innerHeight / screenHeight) * 1.085;
      workStart = window.scrollY + section.getBoundingClientRect().top;
      workDistance = Math.max(1, section.offsetHeight - window.innerHeight);
      requestWorkRender();
    };

    window.addEventListener("scroll", requestWorkRender, { passive: true });
    window.addEventListener("resize", measureWorkZoom);
    window.addEventListener("orientationchange", measureWorkZoom);
    desktopQuery.addEventListener?.("change", measureWorkZoom);
    document.fonts?.ready.then(measureWorkZoom).catch(() => {});

    const onLoad = () => measureWorkZoom();
    if (document.readyState === "complete") {
      onLoad();
    } else {
      window.addEventListener("load", onLoad, { once: true });
    }

    measureWorkZoom();

    return () => {
      window.removeEventListener("scroll", requestWorkRender);
      window.removeEventListener("resize", measureWorkZoom);
      window.removeEventListener("orientationchange", measureWorkZoom);
      window.removeEventListener("load", onLoad);
      desktopQuery.removeEventListener?.("change", measureWorkZoom);
      if (workFrame) cancelAnimationFrame(workFrame);
    };
  }, [sectionRef]);
}
