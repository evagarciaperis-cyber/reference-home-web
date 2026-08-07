"use client";

import type { RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion, DESKTOP_QUERY } from "../core/media";
import { subscribeFrame } from "../core/frameTicker";
import { useIsomorphicLayoutEffect } from "../core/useIsomorphicLayoutEffect";

let pluginRegistered = false;

// Fracción del progreso (0..1) en la que el titular ya está totalmente
// asentado -- deliberadamente pequeña: es una "entrada mínima" (pedido
// explícito), no un tramo de lectura propio.
const TITLE_SETTLE_END = 0.15;

// 2026-08-07 -- reparto obligatorio del progreso (orden que nunca se
// altera, solo estos umbrales son ajustables): VÍDEO -> PAUSA -> CUBIERTA.
//   0.00 -> VIDEO_END   : el vídeo recorre 0 -> duration-0.05.
//   VIDEO_END -> COVER_RISE_START : último fotograma congelado y visible
//     (el vídeo ya no recibe más seeks -- videoP satura en 1 -- así que
//     "congelado" es literal: no hay ninguna escritura de currentTime
//     durante este tramo, nunca una interpolación falsa).
//   COVER_RISE_START -> 1.00 : la cubierta sube y tapa el viewport.
// La Escena 02 nunca puede aparecer antes de progreso=1 porque .stage
// (position:sticky) permanece pineado hasta ahí por construcción -- estos
// umbrales solo deciden CUÁNDO ocurre cada cosa DENTRO de ese recorrido
// ya garantizado, no si puede fugarse antes.
const VIDEO_END = 0.7;
const COVER_RISE_START = 0.82;

// Umbral mínimo antes de reescribir currentTime (~1 fotograma a 30fps) --
// evita seeks redundantes en cada micro-tick de scroll, que es la causa
// más común de "tirones" que no vienen del propio vídeo.
const VIDEO_SEEK_EPSILON = 1 / 30;

// 2026-08-07: Supabase Storage (bucket público web-videos), mismo sistema
// ya usado por BuyerReveal.tsx/BuyerExperience.tsx/MarketingReel.tsx (URL
// completa como constante de módulo, sin helper/config compartido -- ese
// es el patrón real del proyecto, no uno inventado aquí).
//
// 2026-08-07 (misma ronda, más tarde): sustituido "valencia-hero.mp4" por
// "valencia-hero-scrub.mp4" -- reexportado específicamente para scrubbing
// (keyint=1, 192 I-frames de 192 fotogramas totales, H.264 High,
// 1280x720, 24fps, sin audio, faststart, ~14MB). El archivo anterior
// (GOP largo) tardaba más de 2s en completar un seek grande -- confirmado
// que la causa era el encode, no el código (ver historial del hook antes
// de este cambio). Verificado antes de usarlo: 200 sin redirecciones,
// Content-Type: video/mp4, Accept-Ranges: bytes, Access-Control-Allow-Origin: *
// (público, sin auth en cliente).
const VIDEO_SRC =
  "https://yjjiwgpycvlmfyhypgun.supabase.co/storage/v1/object/public/web-videos/valencia-hero-scrub.mp4";

type Refs = {
  sectionRef: RefObject<HTMLElement | null>;
  photoRef: RefObject<HTMLDivElement | null>;
  titleGroupRef: RefObject<HTMLDivElement | null>;
  coverRef: RefObject<HTMLDivElement | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
};

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/**
 * Escena 01 "La fachada" (docs/INMOBILIARIA_VALENCIA_STORYBOARD.md) --
 * apertura corta y directa, sin pin real de GSAP: contenedor alto
 * (.opening, ver altura en ValenciaOpening.module.css) + escenario
 * `position: sticky` (CSS puro, mismo patrón ya estable de
 * useBuyerExperience.ts/useBuyerReveal.ts) + un único ScrollTrigger con
 * scrub que expone `self.progress` 0..1 sobre la altura propia del
 * contenedor ("bottom bottom" cae exactamente al liberarse el sticky, sin
 * spacer ni pin-spacer). `useIsomorphicLayoutEffect` fija el estado
 * inicial antes del primer pintado, sin excepción.
 *
 * Vídeo con scrubbing real, solo desktop: el fondo de la escena es un
 * <video> cuyo `currentTime` sigue el progreso del MISMO ScrollTrigger --
 * nunca reproducción por tiempo, nunca un segundo trigger, nunca easing
 * propio (todo el suavizado que existe ya lo aporta Lenis sobre el
 * scroll nativo, no una interpolación añadida aquí). El movimiento de
 * cámara lo aporta el propio metraje: en desktop NO se aplica ningún
 * drift/translateY ni ningún scale adicional (photoDriftPx = 0 ahí). La
 * fotografía real ya aprobada sigue siendo: (a) el fondo único en
 * mobile/tablet (<=900px, donde no hay vídeo en absoluto -- ni se pide ni
 * se descarga), (b) el fondo único bajo prefers-reduced-motion, y (c) el
 * estado de carga en desktop mientras el vídeo todavía no puede
 * reproducirse (antes de `canplay`) -- nunca un frame negro.
 *
 * Carga (desktop): `src` directo sobre la URL de Supabase -- SIN
 * `fetch`+blob. La ronda anterior precargaba todo el archivo como blob
 * pensando que evitaría esperas de red al saltar de posición, pero (a)
 * `blob:` como src de <video> falla en WebKit/Safari con
 * MEDIA_ERR_SRC_NOT_SUPPORTED (confirmado empíricamente entonces) y (b)
 * la URL de Supabase ya soporta Range Requests reales (verificado: 206
 * Partial Content con Content-Range correcto), que es precisamente lo que
 * el navegador necesita para bufferizar solo lo que hace falta según se
 * secuencea -- no hay ninguna necesidad técnica demostrada de blob aquí.
 * `preload="auto"` (atributo en el JSX) más el guard `readyState >= 2` de
 * abajo son suficientes.
 *
 * Inicialización de Safari/iPadOS: un único `play()` seguido
 * INMEDIATAMENTE de `pause()`, disparado una sola vez tras
 * `loadedmetadata` -- exclusivamente para forzar a Safari a inicializar
 * su decodificador de vídeo. Nunca avanza el vídeo (se pausa en el mismo
 * tick), nunca es el mecanismo de progreso real (eso sigue siendo,
 * exclusivamente, currentTime + ScrollTrigger más abajo), y la promesa de
 * play() se captura con `.catch()` para que un rechazo por política de
 * autoplay no produzca un error sin manejar.
 */
export function useValenciaOpening({ sectionRef, photoRef, titleGroupRef, coverRef, videoRef }: Refs): void {
  useIsomorphicLayoutEffect(() => {
    const section = sectionRef.current;
    const photo = photoRef.current;
    const titleGroup = titleGroupRef.current;
    const cover = coverRef.current;
    const video = videoRef.current;
    if (!section || !photo || !titleGroup || !cover) return;
    if (prefersReducedMotion()) return;

    if (!pluginRegistered) {
      gsap.registerPlugin(ScrollTrigger);
      pluginRegistered = true;
    }

    // Magnitudes menores en mobile/tablet -- el gesto sigue existiendo,
    // solo es más contenido. Mismo breakpoint maestro que el resto del
    // proyecto (DESKTOP_QUERY, 901px). En desktop, driftPx es 0 a
    // propósito -- el vídeo es el único responsable del movimiento ahí.
    const isDesktop = window.matchMedia(DESKTOP_QUERY).matches;
    const titleOffsetPx = isDesktop ? 18 : 12;
    const photoDriftPx = isDesktop ? 0 : 12;

    // Estado inicial explícito -- coincide con la base CSS (sin flash al
    // hidratar): titular ligeramente por asentar, foto en reposo, cubierta
    // completamente fuera de encuadre por abajo.
    gsap.set(titleGroup, { y: titleOffsetPx, opacity: 0.9 });
    gsap.set(photo, { y: 0 });
    gsap.set(cover, { yPercent: 100 });

    // -- Vídeo (solo desktop) -------------------------------------------
    let videoReady = false;
    let initKickDone = false;

    const markVideoReady = () => {
      videoReady = true;
      section.setAttribute("data-video-ready", "true");
    };

    const handleLoadedMetadata = () => {
      if (!video || initKickDone) return;
      initKickDone = true;
      // Inicialización puntual del decodificador (Safari/iPadOS) -- nunca
      // avanza el vídeo: se pausa en el mismo tick. Protegido contra
      // promesas rechazadas (política de autoplay).
      const playResult = video.play();
      if (playResult && typeof playResult.then === "function") {
        playResult.then(() => video.pause()).catch(() => video.pause());
      } else {
        video.pause();
      }
    };
    const handleCanPlay = () => markVideoReady();

    if (isDesktop && video) {
      video.addEventListener("loadedmetadata", handleLoadedMetadata);
      video.addEventListener("canplay", handleCanPlay);
      video.src = VIDEO_SRC;
    }

    const trigger = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const p = self.progress;

        const titleP = clamp01(p / TITLE_SETTLE_END);
        gsap.set(titleGroup, {
          y: lerp(titleOffsetPx, 0, titleP),
          opacity: lerp(0.9, 1, titleP),
        });

        gsap.set(photo, { y: lerp(0, -photoDriftPx, p) });

        // Vídeo: recorre 0->duration-0.05 solo hasta VIDEO_END -- a partir
        // de ahí videoP satura en 1 y el target deja de cambiar, así que
        // esta rama simplemente deja de escribir currentTime (guard de
        // epsilon) -- el "último fotograma congelado" no es un estado
        // especial gestionado aparte, es la consecuencia natural de que
        // el target ya no se mueve.
        if (isDesktop && video && videoReady && video.readyState >= 2 && video.duration) {
          const videoP = clamp01(p / VIDEO_END);
          const target = videoP * Math.max(0, video.duration - 0.05);
          if (Math.abs(video.currentTime - target) >= VIDEO_SEEK_EPSILON) {
            video.currentTime = target;
          }
        }

        const coverP = clamp01((p - COVER_RISE_START) / (1 - COVER_RISE_START));
        gsap.set(cover, { yPercent: lerp(100, 0, coverP) });
      },
    });

    const unsubscribe = subscribeFrame(() => ScrollTrigger.update());

    return () => {
      unsubscribe();
      trigger.kill();
      if (isDesktop && video) {
        video.removeEventListener("loadedmetadata", handleLoadedMetadata);
        video.removeEventListener("canplay", handleCanPlay);
      }
    };
  }, [sectionRef, photoRef, titleGroupRef, coverRef, videoRef]);
}
