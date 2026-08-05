"use client";

import type { RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion, DESKTOP_QUERY } from "../core/media";
import { subscribeFrame } from "../core/frameTicker";
import { useIsomorphicLayoutEffect } from "../core/useIsomorphicLayoutEffect";

let pluginRegistered = false;

const HANDOFF_PERCENT = 100;

type Refs = {
  wrapperRef: RefObject<HTMLElement | null>;
};

/**
 * Relevo BrandStory -> FooterContact. FooterContact (.footerLayer,
 * position:absolute;inset:0 dentro de este wrapper, ver
 * FinalReveal.module.css) no recibe NUNCA un gsap.set: su inmovilidad
 * viene de vivir dentro de un wrapper genuinamente pineado (pin real,
 * pinType:"fixed") mientras dura el relevo -- nunca de una aproximación
 * por flujo de documento.
 *
 * BrandStory necesita, además, la MISMA ventana de scroll para cubrir el
 * wrapper y deslizarse (yPercent 0 -> -100). No puede lograrse con el pin
 * NATIVO de su propio ScrollTrigger (useBrandStory.ts) porque ese pin ya
 * ha terminado -- por diseño, adyacente sin hueco -- justo cuando este
 * empieza: son dos ventanas de scroll consecutivas, no la misma. Así que
 * este archivo promueve BrandStory a position:fixed "a mano" mientras
 * progress>0 (self.progress==0 significa "fuera de este trigger", donde
 * la responsabilidad de `position` es enteramente de useBrandStory.ts).
 *
 * onUpdate de AMBOS triggers corre dentro del mismo ScrollTrigger.update()
 * (mismo subscribeFrame, un solo tick de rAF) -- útil porque nunca hay un
 * frame pintado a medio actualizar, pero también significa que dentro de
 * ese tick hay un orden fijo (useBrandStory.ts se crea antes que este
 * hook, así que su trigger se procesa primero) y solo el ÚLTIMO valor
 * escrito sobre cada propiedad sobrevive al pintado.
 *
 * Bajando: el pin nativo de BrandStory libera PRIMERO (ya no toca
 * `position`) y este onUpdate escribe DESPUÉS -- su escritura es la que
 * queda, correcta. Subiendo: el pin nativo de BrandStory se re-engancha
 * PRIMERO (ya vuelve a poner position:fixed) y este onUpdate corre
 * DESPUÉS en el mismo tick -- si aquí se limpiara `position` (como hacía
 * la versión anterior, con clearProps), esa limpieza sería la última en
 * escribir y borraría el position:fixed recién restaurado por el pin
 * nativo, dejando a BrandStory sin cubrir nada -- el propio wrapper de
 * FooterContact también deja de estar pineado en ese mismo instante (su
 * progreso es el mismo), así que ninguna de las dos capas cubría el
 * viewport: el hueco de fondo crema reportado. Por eso, aquí abajo, la
 * rama progress<=0 NUNCA toca `position/inset/zIndex` -- solo yPercent,
 * que es la única propiedad que useBrandStory.ts no gestiona nunca.
 *
 * 2026-08-05 (fix NotFoundError "removeChild" al navegar Home ->
 * /inmobiliaria-valencia, reproducido con Playwright + instrumentación
 * real de Node.prototype.removeChild/appendChild): este hook usaba
 * `useEffect` normal para crear/destruir el ScrollTrigger. `.finalReveal`
 * (el wrapper que este hook pinea) vive como HIJO DIRECTO de <body> --
 * hermano de <main>, ver page.tsx -- y GSAP, al pinearlo, lo reparenta
 * dentro de un <div class="pin-spacer"> que él mismo inserta. React, en
 * su propio árbol de fibers, sigue creyendo que <body> es el padre
 * directo de .finalReveal.
 *
 * Verificado leyendo el bundle real de react-dom que sirve el proyecto:
 * al desmontar un subárbol eliminado, `commitDeletionEffectsOnFiber` solo
 * ejecuta de forma síncrona, ANTES del removeChild real de un nodo, los
 * efectos `Insertion` y `Layout` -- los efectos `Passive` (los de
 * `useEffect`) de un componente eliminado se procesan en un paso APARTE,
 * después de que la fase de mutación (donde ocurre el removeChild) ya
 * terminó. Con `useEffect`, `trigger.kill()` -- que revierte el pin y
 * quita el pin-spacer -- llegaba sistemáticamente TARDE: React ya había
 * intentado `body.removeChild(.finalReveal)` mientras su padre real
 * seguía siendo el pin-spacer, produciendo el NotFoundError en el 100%
 * de las navegaciones fuera de Home (confirmado con 10 ciclos
 * Home<->/inmobiliaria-valencia). El resto de secciones pineadas del
 * proyecto (MarketingReel, SellingErrors, Process, WorkZoom, BrandStory,
 * TeamFanEntrance...) no sufren esto porque viven ANIDADAS dentro de
 * <main>: React solo necesita un removeChild sobre <main> en sí (que
 * nunca fue reparentado), y todo lo que GSAP reestructuró por dentro
 * desaparece con él sin necesitar removeChild propios.
 *
 * `useIsomorphicLayoutEffect` (useLayoutEffect en cliente) hace que
 * `trigger.kill()` corra síncronamente en la MISMA fase de mutación,
 * antes de que React intente eliminar .finalReveal -- exactamente la
 * garantía de orden que faltaba. No es un check defensivo sobre el
 * síntoma: corrige la propiedad real del nodo (vuelve a ser hijo directo
 * de <body>) antes de que React dependa de ello.
 */
export function useFinalReveal({ wrapperRef }: Refs): void {
  useIsomorphicLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    if (prefersReducedMotion()) return;
    if (!window.matchMedia(DESKTOP_QUERY).matches) return;

    const brandStory = document.querySelector<HTMLElement>("[data-brand-story]");
    if (!brandStory) return;

    if (!pluginRegistered) {
      gsap.registerPlugin(ScrollTrigger);
      pluginRegistered = true;
    }

    const trigger = ScrollTrigger.create({
      trigger: wrapper,
      start: "top top",
      end: `+=${HANDOFF_PERCENT}%`,
      scrub: true,
      pin: true,
      pinType: "fixed",
      pinSpacing: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        if (self.progress <= 0) {
          // Fuera de este trigger: `position` es responsabilidad exclusiva
          // del pin nativo de BrandStory (useBrandStory.ts), que ya se ha
          // reenganchado (o va a hacerlo en este mismo tick) -- no tocarlo
          // aquí evita pisarlo. Solo se deshace el desplazamiento propio
          // de este relevo.
          gsap.set(brandStory, { yPercent: 0 });
          return;
        }
        gsap.set(brandStory, {
          position: "fixed",
          inset: 0,
          zIndex: 2,
          x: 0,
          xPercent: 0,
          y: 0,
          yPercent: -self.progress * 100,
        });
      },
    });

    const unsubscribe = subscribeFrame(() => ScrollTrigger.update());

    return () => {
      unsubscribe();
      trigger.kill();
      gsap.set(brandStory, { clearProps: "position,inset,zIndex,transform" });
    };
  }, [wrapperRef]);
}
