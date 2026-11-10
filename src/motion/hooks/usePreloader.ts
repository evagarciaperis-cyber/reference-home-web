"use client";

import { useEffect, useState } from "react";
import { prefersReducedMotion } from "../core/media";

// Puerto literal del bloque inicial de web-nueva/assets/js/main.js:
//   window.addEventListener('load', () => {
//     setTimeout(() => { preloader.classList.add('is-hidden'); hero.classList.add('is-ready') }, reduced ? 0 : 780)
//   });
const REVEAL_DELAY_MS = 780;
// Como mucho se espera esto (desde que la página está lista) aunque falten
// imágenes por cargar: la cortina no debe tapar la portada mientras se
// descargan fotos de más abajo (Google mide cuándo se ve el titular).
const MAX_WAIT_MS = 900;

/**
 * Señala cuándo termina la secuencia de entrada (evento `load` + 780ms, o
 * 0ms con prefers-reduced-motion). Preloader la usa para ocultarse; el Hero
 * (fase 4) reutilizará el mismo hook para su propia revelación, igual que
 * hoy ambos cambios de clase ocurren en el mismo setTimeout.
 */
export function usePreloader(): { ready: boolean } {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let timeoutId: number | undefined;

    const reveal = () => {
      timeoutId = window.setTimeout(() => setReady(true), prefersReducedMotion() ? 0 : REVEAL_DELAY_MS);
    };

    // A diferencia del script estático original (que siempre se registra
    // antes del evento `load`), un componente React puede montarse después
    // de que `load` ya haya ocurrido. Sin este fallback, el preloader se
    // quedaría fijo en pantalla para siempre en ese caso.
    let done = false;
    const once = () => {
      if (done) return;
      done = true;
      reveal();
    };
    const capId = window.setTimeout(() => {
      if (done) return;
      done = true;
      setReady(true);
    }, MAX_WAIT_MS);

    if (document.readyState === "complete") {
      once();
    } else {
      window.addEventListener("load", once, { once: true });
    }

    return () => {
      window.removeEventListener("load", once);
      window.clearTimeout(capId);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, []);

  return { ready };
}
