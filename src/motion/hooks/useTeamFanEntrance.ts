"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "../core/media";
import { subscribeFrame } from "../core/frameTicker";
import { FAN_LAYOUT } from "@/ui/sections/WorkZoom/teamData";

let pluginRegistered = false;

const DESKTOP_QUERY = "(min-width: 901px)";

type Refs = {
  sectionRef: React.RefObject<HTMLElement | null>;
};

/**
 * Entrada + pausa fijada del bloque "Nuestro equipo" (2026-08-21,
 * segunda versión -- la primera, sin pin, dejaba pasar la sección
 * demasiado rápido para leerla o interactuar con ella). Pin real de
 * GSAP ScrollTrigger, propio y corto (`+=75%`, dentro de 65-90%) --
 * completamente INDEPENDIENTE del pin de Process (useProcess.ts no
 * conoce esta sección, y este hook no conoce Process). Nunca dos pines
 * simultáneos: el de Process ya liberó su scroll mucho antes de que
 * este empiece (con la pausa editorial, ProcessTeamPause, de por
 * medio).
 *
 * Timeline (self.progress 0-1 sobre el pin, duration forzada a 1):
 *  0.00-0.35  micro + titular (data-fan-header)
 *  0.15-0.45  texto de apoyo (data-fan-support)
 *  0.20-0.70  despliegue del abanico -- cada tarjeta es un wrapper
 *             exterior (data-fan-card) que GSAP anima (opacity/x/y/
 *             rotation/scale) desde un estado agrupado cerca del centro
 *             hasta su posición final; el <button> interior (hover) no
 *             se toca aquí, ver WorkZoom.tsx/cardStyle()
 *  0.50-0.90  banda de información activa (data-fan-band)
 *  0.90-1.00  escena estable -- nada se anima, el usuario explora por
 *             hover/foco/tap con total normalidad mientras la sección
 *             sigue fija
 *
 * Al liberar el pin (progress llega a 1) la sección vuelve a flujo
 * normal sin ningún estilo inline residual relevante (GSAP deja
 * opacity/transform ya en su valor final -- 1/neutro -- así que no hay
 * "salto" perceptible). Reversible: scrub sincroniza el timeline con el
 * scroll en ambas direcciones de forma nativa.
 *
 * Desactivado por completo (sin pin, contenido visible tal cual el CSS
 * lo deja por defecto) si: `prefers-reduced-motion`, o viewport por
 * debajo de 901px (mismo criterio DESKTOP_QUERY que el resto del
 * proyecto).
 */
export function useTeamFanEntrance(): Refs {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    if (prefersReducedMotion()) return;
    if (!window.matchMedia(DESKTOP_QUERY).matches) return;

    const header = section.querySelector<HTMLElement>("[data-fan-header]");
    const support = section.querySelector<HTMLElement>("[data-fan-support]");
    const cards = Array.from(section.querySelectorAll<HTMLElement>("[data-fan-card]"));
    const band = section.querySelector<HTMLElement>("[data-fan-band]");

    if (!header || !support || cards.length !== 6 || !band) return;

    if (!pluginRegistered) {
      gsap.registerPlugin(ScrollTrigger);
      pluginRegistered = true;
    }

    gsap.set(header, { opacity: 0, y: 18 });
    gsap.set(support, { opacity: 0, y: 14 });
    gsap.set(band, { opacity: 0, y: 16 });
    // La posición horizontal de cada tarjeta ya la fija el propio flujo
    // flex (.fan/.cardSlot en WorkZoom.module.css) -- este wrapper ya no
    // necesita autocentrarse ni desplazarse en X a mano. Solo entra
    // encogida, apenas rotada y desplazada verticalmente hacia su curva
    // de reposo, e invisible -- mismo criterio que la versión anterior.
    gsap.set(cards, {
      opacity: 0,
      y: (i: number) => FAN_LAYOUT[i].restY * 0.4,
      rotation: (i: number) => FAN_LAYOUT[i].rotate * 0.25,
      scale: 0.7,
    });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: "+=75%",
        scrub: 0.6,
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    tl.to(header, { opacity: 1, y: 0, duration: 0.35, ease: "none" }, 0);
    tl.to(support, { opacity: 1, y: 0, duration: 0.3, ease: "none" }, 0.15);
    tl.to(
      cards,
      {
        opacity: 1,
        y: 0,
        rotation: 0,
        scale: 1,
        duration: 0.5,
        ease: "none",
        stagger: 0.03,
      },
      0.2,
    );
    tl.to(band, { opacity: 1, y: 0, duration: 0.4, ease: "none" }, 0.5);
    // 0.90-1.00: nada más -- pausa estable antes de soltar el pin.

    const handleResize = () => ScrollTrigger.refresh();
    window.addEventListener("resize", handleResize);

    const unsubscribe = subscribeFrame(() => ScrollTrigger.update());

    return () => {
      unsubscribe();
      window.removeEventListener("resize", handleResize);
      tl.scrollTrigger?.kill();
      tl.kill();
      gsap.set([header, support, band, ...cards], { clearProps: "all" });
    };
  }, []);

  return { sectionRef };
}
