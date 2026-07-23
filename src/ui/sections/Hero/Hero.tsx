"use client";

import { usePreloaderReady } from "@/motion/PreloaderProvider";
import { useMagnetic } from "@/motion/hooks/useMagnetic";
import styles from "./Hero.module.css";

const cx = (...classes: Array<string | false | undefined>) => classes.filter(Boolean).join(" ");

// Puerto literal de la sección .hero de index.html. data-reveal-line se
// mantiene aunque no lo lea ningún selector JS ni CSS del original (solo
// las reglas :nth-child de Hero.module.css lo hacen) -- es fidelidad de
// estructura, no funcionalidad activa.
export function Hero() {
  const ready = usePreloaderReady();
  const exploreRef = useMagnetic<HTMLAnchorElement>();

  return (
    <section className={cx(styles.hero, ready && styles.isReady)} id="inicio">
      {/* data-loop-anim: convención de e2e/utils/settle.ts para neutralizar
          animaciones CSS en bucle infinito durante las capturas (no afecta
          al diseño ni al comportamiento real). */}
      <div className={styles.orb} aria-hidden="true" data-loop-anim />

      <div className={styles.topline}>
        <span>Estudio independiente</span>
        <span>© 2026</span>
      </div>

      <div className={styles.title} aria-label="Más que una experiencia digital">
        <div className={styles.line} data-reveal-line>
          <span>Más que una</span>
        </div>
        <div className={cx(styles.line, styles.lineIndent)} data-reveal-line>
          <span>experiencia</span>
        </div>
        <div className={cx(styles.line, styles.lineSerif)} data-reveal-line>
          <span>&amp; digital</span>
        </div>
      </div>

      <div className={styles.footer}>
        <p>Diseñamos un lenguaje digital donde estrategia, tecnología y dirección creativa trabajan como una sola pieza.</p>
        <a ref={exploreRef} className={styles.circleLink} href="#soluciones" aria-label="Explorar la experiencia">
          <span>Explorar</span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 17 17 7M8 7h9v9" />
          </svg>
        </a>
      </div>

      <div className={styles.services} aria-label="Servicios principales">
        <div>
          <span>(01)</span> Dirección digital
        </div>
        <div>
          <span>(02)</span> Desarrollo web
        </div>
        <div>
          <span>(03)</span> Estrategia de marca
        </div>
        <div>
          <span>(04)</span> Experiencias inmersivas
        </div>
      </div>
    </section>
  );
}
