"use client";

import { useRef } from "react";
import { SectionLabel } from "@/ui/primitives/SectionLabel";
import { useWorkZoom } from "@/motion/hooks/useWorkZoom";
import styles from "./WorkZoom.module.css";

// Puerto literal de la sección [data-work-zoom] de index.html: zoom sobre
// una pantalla de dispositivo hasta llenar el viewport, con
// data-header-tone añadido/quitado dinámicamente por useWorkZoom solo
// mientras la sección está "inmersa" (ver comentario del hook).
export function WorkZoom() {
  const sectionRef = useRef<HTMLElement>(null);
  useWorkZoom({ sectionRef });

  return (
    <section className={styles.workZoom} data-work-zoom aria-label="Proyecto destacado" ref={sectionRef}>
      <div className={styles.sticky}>
        <div className={styles.ambient} aria-hidden="true" />
        <div className={styles.heading} data-work-heading>
          <SectionLabel number="05">Proyecto destacado</SectionLabel>
          <h2>
            Descubre
            <br />
            <em>nuestros trabajos</em>
          </h2>
          <p>Desplázate para entrar en el proyecto.</p>
        </div>

        <div className={styles.stage}>
          <div className={styles.device} data-work-device aria-hidden="true">
            <div className={styles.monitor}>
              <span className={styles.camera} />
              <div className={styles.screen} data-work-screen>
                <img src="/images/work-screen.svg" alt="" />
                <div className={styles.shade} data-work-shade />
              </div>
            </div>
            <div className={styles.neck} />
            <div className={styles.base} />
          </div>
        </div>

        <div className={styles.detail} data-work-detail>
          <div>
            <span>Web de arquitectura · 2026</span>
            <h3>Atelier Norte</h3>
          </div>
          <p>
            Dirección digital, diseño editorial y desarrollo de una experiencia donde el proyecto arquitectónico
            ocupa toda la pantalla.
          </p>
          <a href="#contacto">
            Hablemos de tu proyecto <b>↗</b>
          </a>
        </div>

        <div className={styles.scrollHint} data-work-scroll>
          <i />
          <span>Scroll para entrar</span>
        </div>
      </div>
    </section>
  );
}
