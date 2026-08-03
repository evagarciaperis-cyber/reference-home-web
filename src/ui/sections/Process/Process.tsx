"use client";

import { useProcess } from "@/motion/hooks/useProcess";
import styles from "./Process.module.css";

type Service = {
  number: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
};

// Destinos de los CTA -- reutilizados, no inventados:
// - Comprar: /inmuebles, la misma ruta que ya usan los CTA de
//   BuyerExperience/BuyerReveal ("Ver propiedades").
// - Vender / Gestionar tu alquiler: el proyecto no tiene todavía una
//   ruta o ancla propia para "vender" ni para "alquiler" (no existe
//   /vender, /alquiler ni #vender/#alquiler en ningún componente) --
//   quedan pendientes, usan #contacto (el mismo ancla genérica de
//   contacto que ya usan Hero/WorkZoom/TestSection) como destino
//   temporal claramente identificado en la respuesta de este cambio.
// - Asesorarte: #contacto, igual que el CTA principal del Hero y el de
//   TestSection -- ya es el punto de contacto establecido del proyecto.
const SERVICES: Service[] = [
  {
    number: "01",
    title: "Comprar",
    description: "Encontramos, filtramos y negociamos la vivienda adecuada para ti.",
    ctaLabel: "Explorar viviendas",
    ctaHref: "/inmuebles",
  },
  {
    number: "02",
    title: "Vender",
    description: "Diseñamos la estrategia y defendemos el valor de tu propiedad.",
    ctaLabel: "Vender mi vivienda",
    ctaHref: "#contacto",
  },
  {
    number: "03",
    // Salto de línea manual -- es el único título de los cuatro lo
    // bastante largo como para partirse mal según el ancho de columna;
    // se fuerza aquí el mismo corte "Gestionar tu / alquiler" siempre,
    // en vez de dejarlo al wrap automático.
    title: "Gestionar tu\nalquiler",
    description: "Nos ocupamos de todo para que alquilar no te quite tiempo.",
    ctaLabel: "Gestionar mi alquiler",
    ctaHref: "#contacto",
  },
  {
    number: "04",
    title: "Asesorarte",
    description: "Valoración, herencias, negociación y decisiones complejas.",
    ctaLabel: "Hablar con un asesor",
    ctaHref: "#contacto",
  },
];

const BACKGROUND_IMAGE = "/images/services/services-panorama.webp";

// 2026-08-20: una única fotografía panorámica como fondo COMÚN de toda
// la sección (.backgroundMedia, capa global) en vez de una imagen por
// columna -- las cuatro columnas ya no llevan <img> propia, solo un
// overlay individual (.columnOverlay) que aclara/oscurece su porción de
// la MISMA foto al hover. Nunca se corta ni se duplica la imagen.
//
// Pausa cinematográfica -- pin real de GSAP ScrollTrigger (useProcess.ts)
// durante un tramo de scroll, con 4 fases (entrada, servicios, pausa de
// lectura ~38%, salida) + un escalado muy sutil del fondo (1.03 -> 1,
// terminando justo al entrar en la pausa). El hover de columnas
// (crecimiento, overlay individual) es CSS puro, ver Process.module.css
// -- no depende de este hook ni de JS para funcionar. Todo se desactiva
// (contenido visible, sin pin, imagen a escala 1 fija) en
// prefers-reduced-motion y por debajo de 901px -- ver useProcess.ts.
export function Process() {
  const { sectionRef, contentRef } = useProcess();

  return (
    <section className={styles.process} id="proceso" ref={sectionRef}>
      <div className={styles.backgroundMedia} aria-hidden="true">
        <img className={styles.backgroundImage} src={BACKGROUND_IMAGE} alt="" data-process-bg />
      </div>
      <div className={styles.backgroundOverlay} aria-hidden="true" />

      <div className={styles.content} ref={contentRef}>
        <div className={styles.headline}>
          <div className={styles.headlineText}>
            <span className={styles.micro} data-process-micro>
              Servicios
            </span>
            <h2 className={styles.title}>
              <span data-process-title-line1>¿Cómo podemos</span>
              <br />
              <em data-process-title-line2>ayudarte?</em>
            </h2>
          </div>
          <p className={styles.support} data-process-support>
            Cada decisión inmobiliaria empieza de una manera distinta.
          </p>
        </div>

        <div className={styles.grid}>
          {SERVICES.map((service) => (
            <article key={service.number} className={styles.article} data-process-article>
              <div className={styles.columnOverlay} aria-hidden="true" />
              <div className={styles.articleContent}>
                <span className={styles.number} data-process-number>
                  {service.number}
                </span>
                <h3 data-process-title>
                  {service.title.split("\n").map((line, i) => (
                    <span key={line}>
                      {i > 0 && <br />}
                      {line}
                    </span>
                  ))}
                </h3>
                <p data-process-desc>{service.description}</p>
                <a className={styles.ctaLink} data-process-cta href={service.ctaHref}>
                  <span className={styles.ctaLinkText}>{service.ctaLabel}</span>
                  <svg className={styles.ctaLinkArrow} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                    <path
                      d="M3.5 12.5 L12.5 3.5 M6 3.5 H12.5 V10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
