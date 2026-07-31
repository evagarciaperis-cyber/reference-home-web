"use client";

import { useMarketingReel } from "@/motion/hooks/useMarketingReel";
import styles from "./MarketingReel.module.css";

// Escena de vídeo a pantalla completa que se contrae en scroll hasta
// convertirse en el panel central de una composición final de tres
// vídeos con el mismo peso visual (2026-07-28). El vídeo de Marketing
// conserva exactamente su elemento DOM y su transición fullscreen ->
// contracción ya aprobada (useMarketingReel.ts).
//
// Sin flotación, sin tilt, sin microparallax: la única interacción de los
// tres paneles es un indicador editorial "Descubrir" (línea + flecha +
// texto) resuelto enteramente en CSS vía :hover/:focus-within
// (MarketingReel.module.css) -- no hay ningún sistema JS/ticker detrás de
// ella. Los tres vídeos se reproducen siempre en bucle, sin pausarse por
// visibilidad.
//
// 2026-07-28: manos.mp4 -> manos-v2.mp4 (el archivo se sustituyó y el
// nombre cambia a propósito para evitar que el navegador/CDN sirvieran la
// versión anterior cacheada). `key={VIDEO_SRC_RIGHT}` fuerza a React a
// tratar el <video> como un nodo nuevo si esta constante volviera a
// cambiar en el futuro.
//
// 2026-08-19: los tres vídeos pasan de /videos/ local a Supabase Storage
// (bucket público web-videos) -- la web deja de depender de los archivos
// pesados en disco. Los locales no se han borrado.
const VIDEO_SRC_VALORACION = "https://yjjiwgpycvlmfyhypgun.supabase.co/storage/v1/object/public/web-videos/valoracion.mp4";
const VIDEO_SRC_MARKETING = "https://yjjiwgpycvlmfyhypgun.supabase.co/storage/v1/object/public/web-videos/video_marketing.mp4";
const VIDEO_SRC_RIGHT = "https://yjjiwgpycvlmfyhypgun.supabase.co/storage/v1/object/public/web-videos/manos-v2.mp4";

// <article> (no <a>): los paneles serán clicables cuando existan destinos
// reales -- por ahora no se crea ningún enlace vacío. La composición
// interna (panelFrame > video + hoverOverlay + panelCopy + discoverCta)
// está pensada para que, más adelante, baste con cambiar este wrapper por
// <a href=...> sin tocar nada de dentro.
//
// 2026-07-28: sustituye al indicador de esquina inferior izquierda
// ("20 Line Hover Animations") -- ahora el CTA "Descubrir" se centra en el
// panel y va acompañado de un oscurecimiento del vídeo + pérdida de
// presencia del copy inferior (ver hoverOverlay/panelCopy en
// MarketingReel.module.css).
function DiscoverCta() {
  return (
    <span className={styles.discoverCta}>
      <span className={styles.discoverCtaRow}>
        <span className={styles.discoverCtaText}>Descubrir</span>
        <svg className={styles.discoverCtaArrow} viewBox="0 0 24 12" aria-hidden="true" focusable="false">
          <path d="M0 6 H20 M13 1 L20 6 L13 11" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className={styles.discoverCtaLine} aria-hidden="true" />
    </span>
  );
}

export function MarketingReel() {
  const {
    sectionRef,
    stageRef,
    shellRef,
    videoRef,
    copyRef,
    panel2CopyRef,
    panel1MotionRef,
    panel1VideoRef,
    panel1CopyRef,
    panel3MotionRef,
    panel3VideoRef,
    panel3CopyRef,
  } = useMarketingReel();

  return (
    <section className={styles.reel} ref={sectionRef}>
      <div className={styles.stickyStage} ref={stageRef}>
        {/* Panel 01 -- Valoración estratégica */}
        <article className={styles.panelMotionWrapper} data-panel="left" ref={panel1MotionRef}>
          <div className={styles.panelFrame}>
            <video className={styles.video} ref={panel1VideoRef} src={VIDEO_SRC_VALORACION} autoPlay muted loop playsInline preload="auto" />
            <div className={styles.hoverOverlay} aria-hidden="true" />
            <div className={styles.panelCopy} ref={panel1CopyRef}>
              <div className={styles.panelCopyInner}>
                <span className={styles.panelNumber}>01</span>
                <h3 className={styles.panelTitle}>Valoración estratégica</h3>
                <p className={styles.panelBody}>Definimos el precio que genera interés, no el que inmoviliza la vivienda.</p>
              </div>
            </div>
            <DiscoverCta />
          </div>
        </article>

        {/* Panel 02 -- Marketing que vende (vídeo/transición existentes, sin recrear) */}
        <div className={styles.videoShell} ref={shellRef}>
          <div className={styles.panelFrame}>
            <video className={styles.video} ref={videoRef} src={VIDEO_SRC_MARKETING} autoPlay muted loop playsInline preload="auto" />
            <div className={styles.hoverOverlay} aria-hidden="true" />
            <div className={styles.panelCopy} ref={panel2CopyRef}>
              <div className={styles.panelCopyInner}>
                <span className={styles.panelNumber}>02</span>
                <h3 className={styles.panelTitle}>Marketing que vende</h3>
                <p className={styles.panelBody}>Construimos una presentación capaz de situarla ante el comprador adecuado.</p>
              </div>
            </div>
            <DiscoverCta />
          </div>
          <div className={styles.copyOverlay} ref={copyRef}>
            <p className={styles.headline}>Cada vivienda necesita una estrategia propia.</p>
            <p className={styles.subtext}>Valoramos. Posicionamos. Defendemos.</p>
          </div>
        </div>

        {/* Panel 03 -- Negociación experta */}
        <article className={styles.panelMotionWrapper} data-panel="right" ref={panel3MotionRef}>
          <div className={styles.panelFrame}>
            <video key={VIDEO_SRC_RIGHT} className={styles.video} ref={panel3VideoRef} src={VIDEO_SRC_RIGHT} autoPlay muted loop playsInline preload="auto" />
            <div className={styles.hoverOverlay} aria-hidden="true" />
            <div className={styles.panelCopy} ref={panel3CopyRef}>
              <div className={styles.panelCopyInner}>
                <span className={styles.panelNumber}>03</span>
                <h3 className={styles.panelTitle}>Negociación experta</h3>
                <p className={styles.panelBody}>Protegemos el valor de la operación hasta el último acuerdo.</p>
              </div>
            </div>
            <DiscoverCta />
          </div>
        </article>
      </div>
    </section>
  );
}
