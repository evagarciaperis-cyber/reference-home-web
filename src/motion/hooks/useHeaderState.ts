"use client";

import { useEffect, useState } from "react";
import { HEADER_TONE_REFRESH_EVENT } from "../core/events";

const SCROLLED_AFTER_Y = 20;
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
  isOnDark: boolean;
};

/**
 * Recalcula el estado visual del header en cada scroll. El header en sí es
 * una barra fija (position:fixed, Header.module.css) siempre visible --
 * este hook solo decide su TONO (claro/oscuro) según lo que hay detrás en
 * ese instante, nunca si se muestra u oculta.
 */
export function useHeaderState(): HeaderState {
  const [state, setState] = useState<HeaderState>({
    isScrolled: false,
    isOnDark: false,
  });

  useEffect(() => {
    const update = () => {
      const y = window.scrollY;
      const isScrolled = y > SCROLLED_AFTER_Y;

      let isOnDark = false;
      document.querySelectorAll(DARK_SECTION_SELECTOR).forEach((section) => {
        if (isOnDark) return;
        const rect = section.getBoundingClientRect();
        if (rect.top <= SAMPLE_Y && rect.bottom >= SAMPLE_Y) isOnDark = true;
      });

      setState({ isScrolled, isOnDark });
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
