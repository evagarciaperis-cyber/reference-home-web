"use client";

import { useRef } from "react";
import Image from "next/image";
import { usePreloaderReady } from "@/motion/PreloaderProvider";
import { useMagnetic } from "@/motion/hooks/useMagnetic";
import { useHero } from "@/motion/hooks/useHero";
import heroDia from "../../../../images/hero-dia.png";
import heroTarde from "../../../../images/hero-tarde.png";
import heroAtardecer from "../../../../images/hero-atardecer.png";
import heroNoche from "../../../../images/hero-noche.png";
import styles from "./Hero.module.css";

const cx = (...classes: Array<string | false | undefined>) => classes.filter(Boolean).join(" ");

// Hero definitivo (docs/HERO_REDESIGN_SPEC.md, aprobado; corrección
// 2026-07-26 nº2 tras incorporar hero-tarde.png). Misma vivienda
// mediterránea en cuatro momentos de luz -- día/tarde/atardecer/noche --
// en crossfade secuencial dirigido por el progreso de scroll (useHero).
// data-header-tone="dark" es estático (a diferencia de WorkZoom, que lo
// alterna dinámicamente): el Hero mantiene el header en un único tono claro
// durante todo su recorrido gracias al scrim constante (spec, sección 9),
// así que no hace falta lógica de activación por umbral.
export function Hero() {
  const ready = usePreloaderReady();
  const sectionRef = useRef<HTMLElement>(null);
  const valuationRef = useMagnetic<HTMLAnchorElement>();
  useHero({ sectionRef });

  return (
    <section
      className={cx(styles.hero, ready && styles.isReady)}
      id="inicio"
      data-header-tone="dark"
      data-header-transparent="true"
      data-header-force-visible="true"
      ref={sectionRef}
    >
      <div className={styles.sticky}>
        <div className={styles.background} aria-hidden="true">
          {/* Misma cámara bloqueada, mismo encuadre -- solo cambia la luz
              (verificado con diff de bordes, docs/HERO_REDESIGN_SPEC.md,
              sección 0, y de nuevo con hero-tarde.png). preload solo en el
              estado día: es el candidato a LCP; el resto carga eager
              (empiezan enseguida) pero sin competir por la prioridad del
              primer pintado. */}
          <Image
            src={heroDia}
            alt=""
            fill
            sizes="100vw"
            quality={70}
            preload
            className={cx(styles.bgImage, styles.bgDay)}
          />
          <Image
            src={heroTarde}
            alt=""
            fill
            sizes="100vw"
            quality={70}
            loading="eager"
            className={cx(styles.bgImage, styles.bgTarde)}
          />
          <Image
            src={heroAtardecer}
            alt=""
            fill
            sizes="100vw"
            quality={70}
            loading="eager"
            className={cx(styles.bgImage, styles.bgDusk)}
          />
          <Image
            src={heroNoche}
            alt=""
            fill
            sizes="100vw"
            quality={70}
            loading="eager"
            className={cx(styles.bgImage, styles.bgNight)}
          />
          <div className={styles.warmWash} data-hero-warm-wash />
          <div className={styles.coolWash} data-hero-cool-wash />
          <div className={styles.light} data-hero-light />
          <div className={styles.scrimTop} />
          <div className={styles.scrimBottom} />
          <div className={styles.exitOverlay} data-hero-exit />
        </div>

        <div className={styles.topline}>
          <span>Inmobiliaria en Valencia</span>
          <span>© 2026</span>
        </div>

        <div className={styles.content} data-hero-reveal>
          <h1 className={styles.title}>
            Hay viviendas que solo necesitan ser vistas <em>de otra manera</em>.
          </h1>
          <p className={styles.lead}>
            Diseñamos la estrategia, la imagen y el proceso de venta para que cada propiedad alcance todo su valor.
          </p>
        </div>

        {/* 2026-08-22 (ronda 3): el CTA circular y los enlaces editoriales
            salen por completo del flujo de .content -- ya no comparten
            columna vertical con el título/lead ni dependen de
            margin-top:auto, así que su posición nunca cambia según cuánto
            ocupe el copy. Ambos son hijos directos de .sticky (el propio
            contenedor sticky, contexto de posicionamiento real) y se
            colocan con left/bottom absolutos, nunca con transform. */}
        <div className={styles.heroValuationCta}>
          {/* El wrapper exterior (arriba) fija la posición (left/bottom) y
              el tamaño del círculo; useMagnetic aplica su transform SOLO
              sobre este nodo interior, nunca sobre el wrapper posicionado
              -- así el efecto magnético no puede interferir con left/bottom. */}
          <a ref={valuationRef} className={styles.magneticInner} href="#contacto">
            <span>Valora tu vivienda</span>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 17 17 7M8 7h9v9" />
            </svg>
          </a>
        </div>

        <div className={styles.heroBottomLinks}>
          {/* /inmuebles -- misma ruta real que ya usan BuyerReveal,
              BuyerExperience y el CTA "Comprar" de Process, no una ruta
              inventada. */}
          <a className={styles.secondaryCta} href="/inmuebles">
            Ver últimas viviendas <b aria-hidden="true">↗</b>
          </a>
          <a className={styles.secondaryCta} href="#proceso">
            Descubre cómo trabajamos <b aria-hidden="true">↗</b>
          </a>
        </div>
      </div>
    </section>
  );
}
