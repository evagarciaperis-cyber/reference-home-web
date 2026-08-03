"use client";

import { useEffect, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "../core/media";
import { subscribeFrame } from "../core/frameTicker";

let pluginRegistered = false;

const DESKTOP_QUERY = "(min-width: 901px)";
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
 */
export function useFinalReveal({ wrapperRef }: Refs): void {
  useEffect(() => {
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
