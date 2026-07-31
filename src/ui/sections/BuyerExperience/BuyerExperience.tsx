"use client";

import { TestSection } from "@/ui/sections/TestSection";
import { useBuyerExperience } from "@/motion/hooks/useBuyerExperience";
import styles from "./BuyerExperience.module.css";

// 2026-08-19: Supabase Storage (bucket público web-videos) en vez del
// archivo local -- el local no se ha borrado.
const VIDEO_SRC = "https://yjjiwgpycvlmfyhypgun.supabase.co/storage/v1/object/public/web-videos/comprar-inmuebles.mp4";

// Escena "comprar" -- transición de telón (2026-08-13) + continuidad
// "apertura por el centro" (2026-08-18, reescrita: la versión anterior
// tenía una capa fullVideo + panelLeft/panelRight con vídeos propios que
// se cruzaban con opacity -- se veía como un segundo encuadre del vídeo.
// Ahora hay un único <video>, un único elemento del primer frame al
// último: en reposo su clip-path no recorta nada (vídeo normal, sin
// costura posible porque no hay división real); al llegar la apertura,
// el propio clip-path abre un hueco central que revela TestSection --
// ver useBuyerExperience.ts.
//
// data-header-tone="dark"/data-header-hide="true" estáticos: coinciden
// con el estado final (el que se ve bajo prefers-reduced-motion, donde el
// hook nunca llega a ejecutarse) -- en scroll normal, el propio hook los
// corrige nada más arrancar el scrub.
export function BuyerExperience() {
  const { sectionRef, stickyRef, curtainRef, videoRef, overlayRef, microRef, headlineRef, ctaRef } =
    useBuyerExperience();

  return (
    <section
      className={styles.buyer}
      ref={sectionRef}
      id="comprar"
      data-header-tone="dark"
      data-header-hide="true"
    >
      <div className={styles.sticky} ref={stickyRef}>
        {/* TestSection real, único, ya colocado detrás -- se revela por
            oclusión cuando el clip-path del vídeo abre un hueco central,
            nunca anima por su cuenta. */}
        <div className={styles.testLayer}>
          <TestSection />
        </div>

        <div className={styles.videoStage}>
          {/* Único <video> de principio a fin -- nunca se monta, cruza ni
              duplica ningún otro. La "apertura en dos mitades" es el
              clip-path de este mismo elemento animado en
              useBuyerExperience.ts. */}
          <video
            className={styles.video}
            ref={videoRef}
            src={VIDEO_SRC}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
          />

          <div className={styles.overlay} ref={overlayRef} aria-hidden="true" />
          <div className={styles.copy}>
            <span className={styles.micro} ref={microRef}>
              ¿Quieres comprar?
            </span>
            <h2 className={styles.headline} ref={headlineRef}>
              <span className={styles.headlineMain}>Conoce nuestros</span>
              <br />
              <span className={styles.headlineAccent}>últimos inmuebles.</span>
            </h2>
            <a className={styles.cta} href="/inmuebles" ref={ctaRef}>
              <span className={styles.ctaText}>Ver viviendas</span>
              <span className={styles.ctaLine} aria-hidden="true" />
            </a>
          </div>

          <div className={styles.curtain} ref={curtainRef} aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
