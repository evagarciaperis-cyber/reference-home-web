"use client";

import { useRef } from "react";
import { useBrandStory } from "@/motion/hooks/useBrandStory";
import styles from "./BrandStory.module.css";

type Step = {
  number: string;
  icons: [string, string, string];
  titlePrefix: string;
  titleEm: string;
  titleSuffix: string;
  image: string;
  imageAlt: string;
  description: string;
};

// Puerto literal de los 3 <article class="brand-step"> de index.html.
const STEPS: Step[] = [
  {
    number: "01",
    icons: ["⌖", "◎", "↗"],
    titlePrefix: "Descubrir",
    titleEm: "&",
    titleSuffix: "Definir",
    image: "/images/journey-discover.svg",
    imageAlt: "Composición abstracta de investigación y dirección",
    description:
      "Nos sumergimos en tus objetivos, tu audiencia y tu marca para descubrir información valiosa y definir una dirección.",
  },
  {
    number: "02",
    icons: ["◇", "＋", "□"],
    titlePrefix: "Diseño",
    titleEm: "&",
    titleSuffix: "Desarrollo",
    image: "/images/journey-design.svg",
    imageAlt: "Composición abstracta de diseño y desarrollo",
    description:
      "Con la estrategia definida, creamos una imagen de negocio impactante y soluciones digitales de alto rendimiento, diseñadas a medida, nunca de forma genérica.",
  },
  {
    number: "03",
    icons: ["↑", "◌", "∞"],
    titlePrefix: "Publicar",
    titleEm: "y",
    titleSuffix: "Crecer",
    image: "/images/journey-grow.svg",
    imageAlt: "Composición abstracta de publicación y crecimiento",
    description:
      "Damos vida a tu visión, optimizamos su rendimiento y apoyamos tu éxito continuo después del lanzamiento. Estaremos contigo siempre que nos necesites.",
  },
];

// Puerto literal de la sección [data-brand-story] de index.html: la
// secuencia sticky con brújula "De la idea al lanzamiento". Sin sticky ni
// parallax hasta este punto del roadmap (fase 8 confirmó que Process no
// los tenía); esta es la sección a la que realmente pertenecen.
export function BrandStory() {
  const sectionRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  useBrandStory({ sectionRef, stickyRef });

  return (
    <section className={styles.brandStory} data-brand-story aria-label="De la idea al lanzamiento" ref={sectionRef}>
      <div className={styles.sticky} ref={stickyRef}>
        <div className={styles.topline}>
          <span>De la idea al lanzamiento</span>
          <span data-story-count>01 / 03</span>
        </div>

        <div className={styles.words} aria-hidden="true">
          <div className={`${styles.phrase} ${styles.phraseStart}`} data-story-start>
            <span>Tus</span>
            <span>ideas</span>
            <span>historias</span>
          </div>
          <div className={`${styles.phrase} ${styles.phraseEnd}`} data-story-end>
            <span>se transforman</span>
            <span>en historias</span>
            <span>de Marca</span>
          </div>
        </div>

        <div className={styles.route} aria-hidden="true" data-story-route>
          <div className={styles.routeLine}>
            <i data-story-line />
          </div>
          <div className={styles.compass} data-story-compass>
            <svg viewBox="0 0 160 160" role="presentation">
              <circle className={`${styles.compassRing} ${styles.compassRingOuter}`} cx="80" cy="80" r="72" />
              <circle className={styles.compassRing} cx="80" cy="80" r="52" />
              <path
                className={styles.compassTicks}
                d="M80 2v14M80 144v14M2 80h14M144 80h14M25 25l10 10M125 125l10 10M135 25l-10 10M35 125l-10 10"
              />
              <g className={styles.compassNeedle} data-story-needle>
                <path d="M80 25 96 84 80 135 64 76Z" />
                <path d="M80 25 96 84 80 80 64 76Z" className={styles.compassNeedleNorth} />
              </g>
              <circle className={styles.compassCentre} cx="80" cy="80" r="7" />
            </svg>
            <span>N</span>
          </div>
        </div>

        <div className={styles.steps}>
          {STEPS.map((step) => (
            <article className={styles.step} data-story-step key={step.number}>
              <div className={styles.stepHead}>
                <span>{step.number}</span>
                <div className={styles.stepIcons} aria-hidden="true">
                  <i>{step.icons[0]}</i>
                  <i>{step.icons[1]}</i>
                  <i>{step.icons[2]}</i>
                </div>
              </div>
              <h2>
                {step.titlePrefix} <em>{step.titleEm}</em> {step.titleSuffix}
              </h2>
              <div className={styles.stepVisual}>
                <img src={step.image} alt={step.imageAlt} />
              </div>
              <p>{step.description}</p>
            </article>
          ))}
        </div>

        <div className={styles.caption} data-story-caption>
          <span>Desplázate</span>
          <i />
          <span>La brújula marca el recorrido</span>
        </div>
      </div>
    </section>
  );
}
