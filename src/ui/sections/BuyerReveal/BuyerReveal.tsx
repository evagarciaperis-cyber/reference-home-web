"use client";

import { TestSection } from "@/ui/sections/TestSection";
import { useBuyerReveal } from "@/motion/hooks/useBuyerReveal";
import styles from "./BuyerReveal.module.css";

// 2026-08-19: Supabase Storage (bucket público web-videos) en vez del
// archivo local -- el local no se ha borrado. (Componente actualmente
// sin montar en page.tsx -- actualizado igualmente por consistencia.)
const VIDEO_SRC = "https://yjjiwgpycvlmfyhypgun.supabase.co/storage/v1/object/public/web-videos/comprar-inmuebles.mp4";

// Escena "apertura en dos cortinas" (2026-08-15) -- continúa el estado
// final de BuyerExperience (sin tocar ese componente) y lo abre como dos
// puertas hacia los laterales, revelando TestSection -- renderizado UNA
// sola vez, real, DEBAJO de las cortinas dentro de este mismo escenario;
// al liberarse el sticky, sigue siendo el mismo nodo, ya en flujo normal
// (nunca una copia). Arquitectura completa en useBuyerReveal.ts (sticky +
// scrub, sin pin:true).
//
// data-header-tone="dark"/data-header-hide="true" estáticos: coinciden
// con el estado final (el que se ve bajo prefers-reduced-motion, donde el
// hook nunca llega a ejecutarse) -- en scroll normal, el propio hook los
// corrige nada más arrancar el scrub.
export function BuyerReveal() {
  const {
    sectionRef,
    stickyRef,
    panelLeftRef,
    panelRightRef,
    videoLeftRef,
    videoRightRef,
    overlayRef,
    microRef,
    headlineRef,
    ctaRef,
  } = useBuyerReveal();

  return (
    <section
      className={styles.reveal}
      ref={sectionRef}
      id="comprar-abrir"
      data-header-tone="dark"
      data-header-hide="true"
    >
      <div className={styles.sticky} ref={stickyRef}>
        {/* TestSection real, único, ya colocado detrás -- se revela por
            oclusión a medida que las cortinas se apartan, nunca anima por
            su cuenta. */}
        <div className={styles.testLayer}>
          <TestSection />
        </div>

        {/* Dos ventanas sobre el MISMO encuadre de vídeo (misma ruta,
            arrancadas juntas en useBuyerReveal.ts) -- cada .video mide
            100vw y se desplaza en vw (no % del panel) para que ambas
            mitades queden perfectamente alineadas al mismo origen de
            pantalla; el panel (overflow:hidden, 50%+2px con solape real)
            es lo único que decide qué mitad se ve. */}
        <div className={styles.panelLeft} ref={panelLeftRef}>
          <video
            className={styles.video}
            ref={videoLeftRef}
            src={VIDEO_SRC}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
          />
        </div>
        <div className={styles.panelRight} ref={panelRightRef}>
          <video
            className={styles.video}
            ref={videoRightRef}
            src={VIDEO_SRC}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
          />
        </div>

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
      </div>
    </section>
  );
}
