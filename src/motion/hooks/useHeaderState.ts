"use client";

import { useEffect, useRef, useState } from "react";
import { HEADER_TONE_REFRESH_EVENT } from "../core/events";

const SCROLLED_AFTER_Y = 20;
const SAMPLE_Y = 44;

// Mismo breakpoint que useBrandStory.ts/useProcess.ts/etc -- redeclarado
// aquí en vez de importado, siguiendo la convención ya establecida en el
// resto de hooks de motion/.
const DESKTOP_QUERY = "(min-width: 901px)";

// 2026-08-25: en desktop el header empieza oculto por defecto y solo se
// revela con hover/foco -- al salir, espera este margen antes de
// volver a ocultarse (pedido: 500-900ms) para que mover el cursor entre
// la franja superior y el propio header no cause parpadeos.
const HOVER_HIDE_DELAY_MS = 700;

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

// 2026-07-29 (BrandPause): mismo mecanismo genérico que DARK_SECTION_SELECTOR
// -- cualquier sección puede pedir que el header se oculte mientras la cubre,
// marcándose con data-header-hide="true", sin que este hook sepa nada de
// BrandPause en concreto. El header sigue siendo la misma barra fija de
// siempre (Header.module.css): esto no la desmonta ni crea una segunda, solo
// añade una clase que la desplaza fuera de pantalla con transform, reversible
// en cada recálculo de scroll igual que isOnDark.
const HIDE_SECTION_SELECTOR = '[data-header-hide="true"]';

// 2026-08-22 (Hero): mismo mecanismo genérico de auto-declaración -- una
// sección pide que el header se mantenga transparente (sin el fondo sólido
// que .isScrolled aplicaría normalmente) mientras la cubre, marcándose con
// data-header-transparent="true", sin que este hook sepa nada de Hero en
// concreto. Solo suprime el FONDO de .isScrolled; el tono (isOnDark, logo/
// texto blancos) sigue decidiéndolo data-header-tone como siempre.
const TRANSPARENT_SECTION_SELECTOR = '[data-header-transparent="true"]';

// 2026-08-25 (Hero): mismo mecanismo genérico -- una sección puede exigir
// que el header esté SIEMPRE visible mientras la cubre, marcándose con
// data-header-force-visible="true" (hoy solo Hero.tsx, estático, igual que
// su propio data-header-tone). Tiene prioridad absoluta sobre el hover
// desktop, el scroll-hide de otras secciones y cualquier temporizador
// pendiente -- ver el cálculo final de isHidden en update() más abajo. No
// muta hoverRevealedRef ni cancela temporizadores: al salir de la sección,
// el siguiente update() simplemente deja de aplicar esta prioridad y el
// resto de la lógica (que nunca se tocó) vuelve a mandar sin más limpieza.
const FORCE_VISIBLE_SECTION_SELECTOR = '[data-header-force-visible="true"]';

export type HeaderState = {
  isScrolled: boolean;
  isOnDark: boolean;
  isHidden: boolean;
  isTransparent: boolean;
};

/**
 * Recalcula el estado visual del header en cada scroll. El header en sí es
 * una barra fija (position:fixed, Header.module.css) que normalmente
 * permanece siempre visible -- este hook decide su TONO (claro/oscuro) y,
 * desde 2026-07-29, también si debe ocultarse temporalmente (isHidden) según
 * lo que hay detrás en ese instante.
 *
 * También escucha "resize" (2026-07-28, bug encontrado validando el logo
 * del header): sin él, redimensionar la ventana a mitad de scroll podía
 * dejar isOnDark desactualizado -- ninguna sección cambia de tamaño por sí
 * sola al hacer resize sin disparar antes un scroll real, así que sin este
 * listener el header podía quedarse mostrando el tono/logo equivocado
 * hasta el siguiente scroll del usuario.
 *
 * 2026-08-25: en DESKTOP, isHidden deja de depender de qué sección esté
 * pidiendo data-header-hide -- pasa a depender EXCLUSIVAMENTE de
 * hoverRevealedRef (hover/foco en el header o en la franja superior,
 * .hoverZone/Header.tsx), nunca del scroll. El header empieza oculto por
 * defecto y solo se revela mientras el cursor/foco está en esas dos
 * superficies, con un margen de HOVER_HIDE_DELAY_MS al salir. Ninguna
 * sección necesita saberlo: BrandStory sigue llamando a
 * requestHeaderToneRefresh()/data-header-hide exactamente igual que
 * antes, solo que en desktop ese resultado ya no se usa para isHidden
 * (sigue usándose tal cual en MOBILE, donde este hover no aplica).
 * hoverRevealedRef es un ref, no un segundo useState, para que el propio
 * update() de abajo sea la única función que escribe el estado final --
 * los listeners de puntero/foco solo actualizan el ref y vuelven a
 * llamar a la misma update(), sin una segunda fuente de verdad compitiendo.
 */
export function useHeaderState(): HeaderState {
  const [state, setState] = useState<HeaderState>({
    isScrolled: false,
    isOnDark: false,
    isHidden: false,
    isTransparent: false,
  });
  const hoverRevealedRef = useRef(false);

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

      let sectionHidden = false;
      document.querySelectorAll(HIDE_SECTION_SELECTOR).forEach((section) => {
        if (sectionHidden) return;
        const rect = section.getBoundingClientRect();
        if (rect.top <= SAMPLE_Y && rect.bottom >= SAMPLE_Y) sectionHidden = true;
      });

      let isTransparent = false;
      document.querySelectorAll(TRANSPARENT_SECTION_SELECTOR).forEach((section) => {
        if (isTransparent) return;
        const rect = section.getBoundingClientRect();
        if (rect.top <= SAMPLE_Y && rect.bottom >= SAMPLE_Y) isTransparent = true;
      });

      let forceVisible = false;
      document.querySelectorAll(FORCE_VISIBLE_SECTION_SELECTOR).forEach((section) => {
        if (forceVisible) return;
        const rect = section.getBoundingClientRect();
        if (rect.top <= SAMPLE_Y && rect.bottom >= SAMPLE_Y) forceVisible = true;
      });

      const isDesktop = window.matchMedia(DESKTOP_QUERY).matches;
      const isHidden = forceVisible ? false : isDesktop ? !hoverRevealedRef.current : sectionHidden;

      setState({ isScrolled, isOnDark, isHidden, isTransparent });
    };

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    window.addEventListener(HEADER_TONE_REFRESH_EVENT, update);
    update();

    // -- Revelado por hover/foco (desktop) -------------------------------
    // Superficies: el propio header (data-header) y la franja invisible
    // superior (data-header-hover-zone, Header.tsx). Entrar en cualquiera
    // de las dos revela; salir de ambas programa un ocultamiento tras
    // HOVER_HIDE_DELAY_MS, cancelado si el cursor vuelve antes -- cruzar
    // de la franja al header (o viceversa) sin ese margen no debe
    // parpadear. focusout solo programa el ocultamiento si el foco
    // realmente sale de las dos superficies (relatedTarget), para que
    // tabular entre enlaces del propio header no lo oculte a medio camino.
    // Listeners simples (pointerenter/pointerleave/focusin/focusout), sin
    // RAF propio -- no interfiere con Lenis/ScrollTrigger ni con el
    // ticker compartido de motion/core/frameTicker.ts porque no usa
    // ninguno de los dos.
    const headerEl = document.querySelector<HTMLElement>("[data-header]");
    const hoverZoneEl = document.querySelector<HTMLElement>("[data-header-hover-zone]");
    const surfaces = [headerEl, hoverZoneEl].filter((el): el is HTMLElement => !!el);
    let hideTimer: number | null = null;

    const clearHideTimer = () => {
      if (hideTimer !== null) {
        window.clearTimeout(hideTimer);
        hideTimer = null;
      }
    };
    const reveal = () => {
      clearHideTimer();
      if (!hoverRevealedRef.current) {
        hoverRevealedRef.current = true;
        update();
      }
    };
    const scheduleHide = () => {
      clearHideTimer();
      hideTimer = window.setTimeout(() => {
        hoverRevealedRef.current = false;
        hideTimer = null;
        update();
      }, HOVER_HIDE_DELAY_MS);
    };
    const isWithinHoverSurfaces = (node: Node | null) =>
      !!node && surfaces.some((el) => el.contains(node));
    const handleFocusOut = (event: FocusEvent) => {
      if (isWithinHoverSurfaces(event.relatedTarget as Node | null)) return;
      scheduleHide();
    };

    surfaces.forEach((el) => {
      el.addEventListener("pointerenter", reveal);
      el.addEventListener("pointerleave", scheduleHide);
    });
    headerEl?.addEventListener("focusin", reveal);
    headerEl?.addEventListener("focusout", handleFocusOut);

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener(HEADER_TONE_REFRESH_EVENT, update);
      clearHideTimer();
      surfaces.forEach((el) => {
        el.removeEventListener("pointerenter", reveal);
        el.removeEventListener("pointerleave", scheduleHide);
      });
      headerEl?.removeEventListener("focusin", reveal);
      headerEl?.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

  return state;
}
