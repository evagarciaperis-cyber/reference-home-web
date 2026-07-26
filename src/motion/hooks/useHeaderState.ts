"use client";

import { useEffect, useRef, useState } from "react";
import { HEADER_TONE_REFRESH_EVENT } from "../core/events";

// Puerto literal de updateHeader() en main.js (mismos umbrales numéricos).
const SCROLLED_AFTER_Y = 20;
const HIDE_AFTER_Y = 500;
const SAMPLE_Y = 44;

// El original identifica las secciones "oscuras" con una lista fija de
// selectores (.solutions, .process, .work-zoom, .contact, .site-footer),
// ninguna de las cuales existe todavía. En vez de reproducir esa lista
// aquí -- y tener que volver a tocar este hook cada vez que se migre una
// sección nueva -- cualquier sección se declara oscura marcándose ella
// misma con data-header-tone="dark" (docs/ARQUITECTURA.md, sección 6).
// El caso especial del original (work-zoom solo cuenta como oscura
// mientras está "inmersa") se resuelve igual: esa sección decidirá cuándo
// añadir/quitar su propio atributo, sin que Header sepa nada de ella.
// Resuelto en la fase 9: useWorkZoom añade/quita data-header-tone en su
// propio elemento y dispara HEADER_TONE_REFRESH_EVENT en el mismo frame en
// que cruza el umbral de inmersión -- igual que el original invoca
// updateHeader() explícitamente dentro de renderWorkZoom(), en vez de
// esperar al próximo evento de scroll (que podría no llegar de inmediato
// si el usuario deja de hacer scroll justo en el umbral).
const DARK_SECTION_SELECTOR = '[data-header-tone="dark"]';

export type HeaderState = {
  isScrolled: boolean;
  isHidden: boolean;
  isOnDark: boolean;
};

/**
 * Recalcula el estado visual del header en cada scroll. `menuOpen` sustituye
 * la lectura directa de `document.body.classList.contains('no-scroll')` del
 * original por el estado de React que ya controla esa clase (ver
 * SiteHeader), evitando leer del DOM algo que ya tenemos como estado.
 */
export function useHeaderState(menuOpen: boolean): HeaderState {
  const [state, setState] = useState<HeaderState>({
    isScrolled: false,
    isHidden: false,
    isOnDark: false,
  });

  const menuOpenRef = useRef(menuOpen);
  useEffect(() => {
    menuOpenRef.current = menuOpen;
  }, [menuOpen]);

  useEffect(() => {
    // Persiste durante toda la vida del componente, igual que la variable de
    // módulo `lastScroll` del original -- no se resetea en cada scroll.
    let lastScroll = 0;

    const update = () => {
      const y = window.scrollY;
      const isScrolled = y > SCROLLED_AFTER_Y;

      let isOnDark = false;
      let nearDarkSection = false;
      document.querySelectorAll(DARK_SECTION_SELECTOR).forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= SAMPLE_Y && rect.bottom >= SAMPLE_Y) isOnDark = true;
        // Ventana más ancha que isOnDark (que solo mira una línea de
        // muestreo a SAMPLE_Y): sigue siendo true mientras la sección
        // oscura conserve CUALQUIER parte visible en el viewport, no solo
        // esa línea. Cubre el hueco final del hand-off Hero -> Manifesto,
        // donde el sticky del Hero ya ha soltado la línea de muestreo pero
        // la sección siguiente (con z-index superior, ver Manifesto) aún
        // no ha terminado de cubrir físicamente el header.
        if (rect.bottom > 0 && rect.top < window.innerHeight) nearDarkSection = true;
      });

      // El auto-ocultado por dirección de scroll no debe competir con una
      // sección oscura inmersiva (Hero, WorkZoom) -- ahí el header se
      // oculta de forma física (la siguiente sección lo cubre al subir,
      // ver Manifesto), nunca por sí solo. Sin esto, un Hero alto (400vh)
      // supera el umbral HIDE_AFTER_Y casi de inmediato y el header
      // desaparece muy pronto dentro de su propio recorrido.
      const isHidden = !nearDarkSection && y > lastScroll && y > HIDE_AFTER_Y && !menuOpenRef.current;
      lastScroll = Math.max(0, y);

      setState({ isScrolled, isHidden, isOnDark });
    };

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener(HEADER_TONE_REFRESH_EVENT, update);
    update();

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener(HEADER_TONE_REFRESH_EVENT, update);
    };
  }, []);

  return state;
}
