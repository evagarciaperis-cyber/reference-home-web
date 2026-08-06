"use client";

import { useRef } from "react";
import Image from "next/image";
import { useValenciaOpening } from "@/motion/hooks/useValenciaOpening";
import styles from "./ValenciaOpening.module.css";

// PLACEHOLDER FOTOGRÁFICO (2026-08-05) -- docs/INMOBILIARIA_VALENCIA_MASTERPLAN.md
// marca la fotografía real de esta escena como pendiente de producción
// (candidato: una de las viviendas del clímax, Cap. 06, cuando exista).
// Mientras tanto se reutiliza "/images/story/background/story-background.webp"
// -- YA existe en el proyecto y ya está aprobada para uso editorial a
// pantalla completa (es el fondo real de BrandStory en la Home): misma
// disciplina fotográfica pedida aquí (arquitectura mediterránea, luz
// natural, sin gente, sin gran angular de portal). Sustituir por la
// fotografía definitiva de esta página no requiere tocar nada más que
// esta constante.
const PLACEHOLDER_PHOTO_SRC = "/images/story/background/story-background.webp";

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

  useValenciaOpening({ sectionRef, photoRef, titleGroupRef, coverRef });

  return (
    <section className={styles.opening} data-header-tone="dark" data-header-transparent="true" ref={sectionRef}>
      <div className={styles.stage}>
        <div className={styles.photo} ref={photoRef} aria-hidden="true">
          <Image
            src={PLACEHOLDER_PHOTO_SRC}
            alt=""
            fill
            sizes="100vw"
            quality={75}
            priority
            className={styles.photoImg}
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
