"use client";

import { useRef } from "react";
import Image from "next/image";
import { useValenciaOpening } from "@/motion/hooks/useValenciaOpening";
import styles from "./ValenciaOpening.module.css";

// PLACEHOLDER FOTOGRÁFICO -- IA, NO FOTOGRAFÍA REAL (2026-08-06).
// docs/INMOBILIARIA_VALENCIA_MASTERPLAN.md marca la fotografía real de
// esta escena como pendiente de producción (candidato: una de las
// viviendas del clímax, Cap. 06, cuando exista). Esta imagen concreta
// (skyline de Valencia -- cúpula, avenida, torre -- al atardecer) es una
// generación de IA (ChatGPT) aportada por el cliente; confirmado
// explícitamente con él que NO es fotografía real y que se usa aquí
// únicamente como placeholder mejorado (sustituye a la anterior,
// story-background.webp) mientras se produce la fotografía real
// definitiva -- ver docs/INMOBILIARIA_VALENCIA_MASTERPLAN.md, regla de
// "cero fotografía de stock/fabricada" para el resto del proyecto, que
// esta imagen todavía no cumple. Sustituirla no requiere tocar nada más
// que esta constante (el object-position por breakpoint de
// ValenciaOpening.module.css está calibrado a ESTA composición concreta
// -- cúpula en el tercio izquierdo, torre a la derecha -- y habrá que
// recalibrarlo si la fotografía definitiva tiene un encuadre distinto).
const PLACEHOLDER_PHOTO_SRC = "/images/valencia-opening/valencia-skyline-atardecer.png";

// Escena 01 "La fachada" (docs/INMOBILIARIA_VALENCIA_STORYBOARD.md) --
// apertura de /inmobiliaria-valencia. Sin pin real de GSAP: contenedor
// alto + escenario `position: sticky` (ver useValenciaOpening.ts), un
// único CTA exploratorio (nunca de conversión fuerte, regla explícita
// del storyboard) como simple cue de scroll, sin enlace propio.
//
// data-header-tone="dark" + data-header-transparent="true": mismo
// mecanismo genérico que ya usa Hero.tsx en la Home (useHeaderState.ts
// los lee sin saber nada de esta sección) -- header en tono claro sobre
// la fotografía, sin fondo sólido, durante todo el recorrido de la
// escena. Deliberadamente SIN data-header-force-visible: a diferencia
// del Hero de la Home (recorrido largo, primera puerta del sitio), esta
// escena es corta y quien llega aquí ya trae intención -- el header se
// comporta como en el resto de esta página (revelado por hover en
// desktop), no se fuerza a estar siempre visible.
export function ValenciaOpening() {
  const sectionRef = useRef<HTMLElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);
  const titleGroupRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useValenciaOpening({ sectionRef, photoRef, titleGroupRef, coverRef, videoRef });

  return (
    <section className={styles.opening} data-header-tone="dark" data-header-transparent="true" ref={sectionRef}>
      <div className={styles.stage}>
        <div className={styles.photo} ref={photoRef} aria-hidden="true">
          {/* Fotografía real -- fondo único en mobile/tablet (<=900px) y
              bajo prefers-reduced-motion (ver .video en
              ValenciaOpening.module.css), y estado de carga en desktop
              mientras el vídeo todavía no está listo (useValenciaOpening.ts
              solo marca data-video-ready cuando el vídeo dispara
              `canplay`) -- nunca un frame negro. */}
          <Image
            src={PLACEHOLDER_PHOTO_SRC}
            alt=""
            fill
            sizes="100vw"
            quality={75}
            priority
            className={styles.photoImg}
          />
          {/* Vídeo con scrubbing real -- solo desktop (>=901px), nunca en
              mobile/tablet ni bajo prefers-reduced-motion (ver
              useValenciaOpening.ts: el `src` solo se asigna por JS cuando
              se confirma desktop, así que en mobile ni siquiera se
              descarga). `currentTime` lo gobierna exclusivamente el mismo
              ScrollTrigger de la escena -- nunca reproducción por tiempo,
              nunca un segundo trigger. Sin object-position propio: hereda
              el mismo encuadre de escritorio que la fotografía a través de
              .videoEl (ValenciaOpening.module.css) y NO recibe ningún
              transform (ni translateY de deriva, ni scale) -- el
              movimiento de cámara es responsabilidad exclusiva del propio
              metraje, pedido explícito. */}
          <video
            ref={videoRef}
            className={styles.videoEl}
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
          />
        </div>

        <div className={styles.scrim} aria-hidden="true" />

        <div className={styles.topline}>
          <span>Vender en Valencia</span>
          <span>01 — Apertura</span>
        </div>

        <div className={styles.content}>
          <div className={styles.titleGroup} ref={titleGroupRef}>
            <h1 className={styles.headline}>
              <span className={styles.headlineMain}>Esta ciudad no necesita</span>
              <br />
              <span className={styles.headlineAccent}>otra inmobiliaria más.</span>
            </h1>
            <p className={styles.sub}>
              Necesita una estrategia que entienda lo que tu vivienda vale de verdad —
              barrio a barrio, no en genérico.
            </p>
          </div>

          <div className={styles.cue} aria-hidden="true">
            <span className={styles.cueRing}>↓</span>
            Descubre cómo
          </div>
        </div>

        {/* Cubierta física -- plano sólido que sube desde fuera del
            encuadre (yPercent 100 -> 0, useValenciaOpening.ts) hasta
            ocupar toda la fotografía. Mismo color que el fondo de la
            escena siguiente (--color-bg-secondary): al terminar de subir,
            la pantalla ya está en el estado exacto en el que necesita
            empezar el siguiente capítulo, sin costura. */}
        <div className={styles.cover} ref={coverRef} aria-hidden="true" />
      </div>
    </section>
  );
}
