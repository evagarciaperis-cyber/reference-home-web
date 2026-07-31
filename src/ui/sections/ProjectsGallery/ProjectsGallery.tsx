"use client";

import { useRef } from "react";
import { useHorizontalGallery } from "@/motion/hooks/useHorizontalGallery";
import styles from "./ProjectsGallery.module.css";

type Step = {
  image: string;
  imageAlt: string;
  number: string;
  title: string;
  description: string;
};

// Contenido de "nuestro método" en cinco pasos (2026-08-03) -- sustituye
// al listado de proyectos ficticios. Mecanismo horizontal intacto (mismo
// [data-horizontal-section]/[data-horizontal-track], useHorizontalGallery.ts
// sin tocar): solo cambia el contenido de cada tarjeta. Rutas preparadas
// para las fotografías reales en reference-home/public/images/pasos/ -- si
// el archivo todavía no existe, la tarjeta simplemente no pinta imagen (el
// fondo neutro de .media, ProjectsGallery.module.css, cubre el hueco); son
// <img> normales, nunca bloquean el build ni el dev server.
const STEPS: Step[] = [
  {
    image: "/images/pasos/paso1.jpg",
    imageAlt: "Análisis y valoración de la vivienda",
    number: "01",
    title: "Análisis y valoración",
    description: "Estudiamos tu vivienda y el mercado para definir el mejor precio de salida.",
  },
  {
    image: "/images/pasos/paso2.jpg",
    imageAlt: "Estrategia de venta a medida",
    number: "02",
    title: "Estrategia a medida",
    description: "Creamos un plan de marketing y comercial específico para tu vivienda.",
  },
  {
    image: "/images/pasos/paso3.jpg",
    imageAlt: "Promoción inteligente de la vivienda",
    number: "03",
    title: "Promoción inteligente",
    description: "Difundimos tu vivienda en los canales que realmente atraen compradores.",
  },
  {
    image: "/images/pasos/paso4.jpg",
    imageAlt: "Gestión de visitas cualificadas",
    number: "04",
    title: "Gestión de visitas",
    description:
      "Filtramos y gestionamos compradores interesados para que solo visites con quien realmente puede comprar.",
  },
  {
    image: "/images/pasos/paso5.jpg",
    imageAlt: "Negociación y cierre de la operación",
    number: "05",
    title: "Negociación y cierre",
    description: "Negociamos las mejores condiciones y te acompañamos hasta la firma y la posventa.",
  },
];

// data-horizontal-section y data-horizontal-track ya eran atributos
// literales en el original (no clases) -- se reutilizan tal cual.
// data-horizontal-viewport, data-project-card y data-project-progress-bar
// son la adaptación necesaria para lo que en el original eran selectores
// de clase (.projects__viewport, .project-card, .projects__progress b),
// ahora hasheados por CSS Modules (mismo patrón que fases anteriores).
export function ProjectsGallery() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  useHorizontalGallery({ sectionRef, trackRef, viewportRef });

  return (
    <section ref={sectionRef} className={styles.projects} id="proyectos" data-horizontal-section>
      <div className={styles.sticky}>
        <div className={styles.intro}>
          <h2>
            <span className={styles.headlineMain}>Cada paso</span>
            <br />
            <span className={styles.headlineAccent}>importa.</span>
          </h2>
          <p>
            Una venta bien hecha necesita análisis, estrategia, promoción, selección de compradores y una
            negociación cuidada hasta el cierre.
          </p>
          <div className={styles.progress}>
            <span data-project-current>01</span>
            <i>
              <b data-project-progress-bar />
            </i>
            <span>{String(STEPS.length).padStart(2, "0")}</span>
          </div>
        </div>
        <div ref={viewportRef} className={styles.viewport} data-horizontal-viewport>
          <div ref={trackRef} className={styles.track} data-horizontal-track>
            {STEPS.map((step) => (
              <article key={step.number} className={styles.card} data-project-card tabIndex={0}>
                <div className={styles.media}>
                  <img src={step.image} alt={step.imageAlt} />
                </div>
                <div className={styles.overlay} aria-hidden="true" />
                <span className={styles.cardNumber} aria-hidden="true">
                  {step.number}
                </span>
                <div className={styles.cardFoot}>
                  <div className={styles.cardTitleWrap}>
                    <span className={styles.cardLine} aria-hidden="true" />
                    <h3 className={styles.cardTitle}>{step.title}</h3>
                  </div>
                </div>
                <p className={styles.cardDescription}>{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
