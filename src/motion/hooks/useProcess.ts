"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion, DESKTOP_QUERY } from "../core/media";
import { subscribeFrame } from "../core/frameTicker";

let pluginRegistered = false;

const LINE_COLOR = "rgba(240, 223, 207, .16)";
const LINE_COLOR_TRANSPARENT = "rgba(240, 223, 207, 0)";

type Refs = {
  sectionRef: React.RefObject<HTMLElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
};

/**
 * Pausa cinematográfica de Process/"¿Cómo podemos ayudarte?" (2026-08-20).
 * Pin real de GSAP ScrollTrigger (pin:true) -- una única sección
 * autocontenida, un único ScrollTrigger, sin ningún otro mecanismo de
 * pin/sticky compitiendo por el mismo DOM.
 *
 * 2026-08-21: este hook controla ÚNICAMENTE Process. Se intentó varias
 * veces (tres arquitecturas distintas) hacerle conocer/revelar a Team
 * (WorkZoom) al final de su pin -- ninguna funcionó de forma estable
 * visualmente (mezcla de contenido, texto/retratos superpuestos, la
 * siguiente sección entrando antes de tiempo) y se abandonó por decisión
 * explícita: Process y Team vuelven a ser completamente independientes,
 * separados por una pausa editorial simple (ProcessTeamPause, sin pin,
 * sin JS) en vez de cualquier efecto de plegado/handoff. Este hook no
 * conoce a WorkZoom ni tiene ninguna referencia a él.
 *
 * Todo lo que se anima se selecciona por atributo `data-process-*` (mismo
 * patrón que useHorizontalGallery.ts) en vez de por ref individual --
 * más de 15 nodos distintos (micro, 2 líneas del titular, apoyo, 4
 * números, 4 títulos, 4 descripciones, 4 CTA de texto, 4 bordes).
 *
 * Timeline (self.progress 0-1, duration forzada a 1 -- el último tween
 * termina exactamente en 1, así que las posiciones de abajo SON
 * self.progress, no hace falta normalizar por tl.duration()):
 *  Fase 1 entrada    0.00-0.18
 *  Fase 2 servicios  0.18-0.42
 *  Fase 3 pausa      0.42-0.80 (38% del total, dentro de 30-40% pedido --
 *                    tween vacío, nada se anima, se puede leer con calma)
 *  Fase 4 salida     0.80-1.00 (ligera subida + pérdida de opacidad del
 *                    conjunto, nunca una desaparición brusca -- Process
 *                    permanece completo y legible hasta el final, luego
 *                    libera el scroll con normalidad)
 *
 * Fondo (data-process-bg): un único <img> panorámico compartido por toda
 * la sección (nunca una imagen por columna) -- escala 1.03 -> 1 entre
 * 0.00 y 0.42, terminando justo al entrar en la pausa. Sin parallax, sin
 * desplazamiento: mismo encuadre siempre, el hover de columnas nunca lo
 * toca (ver Process.module.css, overlays individuales por columna). No
 * se toca su opacidad para "revelar" nada -- Process es opaco de
 * principio a fin.
 *
 * El hover de las columnas (crecimiento, imagen, overlay, micro-
 * desplazamientos) es CSS puro (Process.module.css, :hover/:has()) -- no
 * vive en este hook, no usa GSAP, no depende de JS para funcionar.
 *
 * Desactivado por completo (sin pin, sin timeline, contenido visible tal
 * cual el CSS lo deja por defecto) si: `prefers-reduced-motion`, o
 * viewport por debajo de 901px (tablet/móvil -- "no forzar expansión
 * compleja", mismo criterio DESKTOP_QUERY que useHorizontalGallery.ts).
 */
export function useProcess(): Refs {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const content = contentRef.current;
    if (!section || !content) return;

    if (prefersReducedMotion()) return;
    if (!window.matchMedia(DESKTOP_QUERY).matches) return;

    if (!pluginRegistered) {
      gsap.registerPlugin(ScrollTrigger);
      pluginRegistered = true;
    }

    const background = section.querySelector<HTMLElement>("[data-process-bg]");
    const micro = section.querySelector<HTMLElement>("[data-process-micro]");
    const line1 = section.querySelector<HTMLElement>("[data-process-title-line1]");
    const line2 = section.querySelector<HTMLElement>("[data-process-title-line2]");
    const support = section.querySelector<HTMLElement>("[data-process-support]");
    const articles = Array.from(section.querySelectorAll<HTMLElement>("[data-process-article]"));
    const numbers = Array.from(section.querySelectorAll<HTMLElement>("[data-process-number]"));
    const titles = Array.from(section.querySelectorAll<HTMLElement>("[data-process-title]"));
    const descriptions = Array.from(section.querySelectorAll<HTMLElement>("[data-process-desc]"));
    const ctas = Array.from(section.querySelectorAll<HTMLElement>("[data-process-cta]"));

    if (
      !background ||
      !micro ||
      !line1 ||
      !line2 ||
      !support ||
      articles.length !== 4 ||
      numbers.length !== 4 ||
      titles.length !== 4 ||
      descriptions.length !== 4 ||
      ctas.length !== 4
    ) {
      return;
    }

    gsap.set(background, { scale: 1.03 });
    gsap.set([micro, support], { opacity: 0, y: 20 });
    gsap.set([line1, line2], { opacity: 0, y: 24 });
    gsap.set(numbers, { opacity: 0, y: 12 });
    gsap.set(titles, { opacity: 0, y: 18 });
    gsap.set(descriptions, { opacity: 0, y: 12 });
    gsap.set(ctas, { opacity: 0, y: 10 });
    gsap.set(articles, { borderRightColor: LINE_COLOR_TRANSPARENT });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: "+=170%",
        scrub: 1,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    // Fondo -- escalado muy sutil (1.03 -> 1) a lo largo de la entrada +
    // servicios, terminando exactamente al llegar a la pausa (0.42): "al
    // entrar en la pausa, llegar a 1". Sin parallax, sin desplazamiento,
    // mismo encuadre siempre -- solo esta reducción de escala.
    tl.to(background, { scale: 1, duration: 0.42, ease: "none" }, 0);

    // -- Fase 1, 0.00-0.18: entra el microtexto, el titular (segunda
    // línea "ayudarte?" ligeramente después de la primera) y el apoyo.
    tl.to(micro, { opacity: 1, y: 0, duration: 0.06, ease: "none" }, 0);
    tl.to(line1, { opacity: 1, y: 0, duration: 0.07, ease: "none" }, 0.03);
    tl.to(line2, { opacity: 1, y: 0, duration: 0.07, ease: "none" }, 0.07);
    tl.to(support, { opacity: 1, y: 0, duration: 0.07, ease: "none" }, 0.11);

    // -- Fase 2, 0.18-0.42: líneas separadoras, números, títulos,
    // descripciones y flechas, en ese orden.
    tl.to(articles, { borderRightColor: LINE_COLOR, duration: 0.06, ease: "none" }, 0.18);
    tl.to(numbers, { opacity: 1, y: 0, duration: 0.06, ease: "none", stagger: 0.02 }, 0.22);
    tl.to(titles, { opacity: 1, y: 0, duration: 0.08, ease: "none", stagger: 0.02 }, 0.26);
    tl.to(descriptions, { opacity: 1, y: 0, duration: 0.08, ease: "none", stagger: 0.02 }, 0.3);
    // CTA de texto de cada columna -- entra en conjunto (sin stagger) justo
    // después de las descripciones y termina exactamente en 0.42, el mismo
    // instante en que arranca la pausa (fase 3): todo el contenido ya está
    // presente antes de que "no se anime nada".
    tl.to(ctas, { opacity: 1, y: 0, duration: 0.04, ease: "none" }, 0.38);

    // -- Fase 3, 0.42-0.80 (38%, dentro de 30-40%): pausa real -- tween
    // vacío, nada se anima, la composición completa queda quieta y
    // legible.
    tl.to({}, { duration: 0.38 }, 0.42);

    // -- Fase 4, 0.80-1.00: salida limpia -- ligera subida + pérdida de
    // opacidad del conjunto, nunca una desaparición brusca; el pin se
    // libera justo al terminar (self.progress llega a 1) y el scroll
    // continúa con normalidad hacia lo que venga después (una pausa
    // editorial simple, ver ProcessTeamPause).
    tl.to(content, { opacity: 0.85, y: -16, duration: 0.2, ease: "none" }, 0.8);

    const handleResize = () => ScrollTrigger.refresh();
    window.addEventListener("resize", handleResize);

    const unsubscribe = subscribeFrame(() => ScrollTrigger.update());

    return () => {
      unsubscribe();
      window.removeEventListener("resize", handleResize);
      tl.scrollTrigger?.kill();
      tl.kill();
      gsap.set([background, micro, support, line1, line2, ...articles, ...numbers, ...titles, ...descriptions, ...ctas, content], {
        clearProps: "all",
      });
    };
  }, []);

  return { sectionRef, contentRef };
}
