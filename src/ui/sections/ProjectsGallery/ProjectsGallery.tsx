"use client";

import { useRef } from "react";
import { SectionLabel } from "@/ui/primitives/SectionLabel";
import { useHorizontalGallery } from "@/motion/hooks/useHorizontalGallery";
import styles from "./ProjectsGallery.module.css";

type Project = {
  image: string;
  imageAlt: string;
  category: string;
  number: string;
  titleLine1: string;
  titleLine2: string;
};

// Puerto literal de los 7 <article class="project-card"> de index.html.
const PROJECTS: Project[] = [
  {
    image: "/images/project-01.svg",
    imageAlt: "Proyecto ficticio Atelier Norte",
    category: "Dirección de arte",
    number: "01",
    titleLine1: "Atelier",
    titleLine2: "Norte",
  },
  {
    image: "/images/project-02.svg",
    imageAlt: "Proyecto ficticio Casa Serena",
    category: "Web inmobiliaria",
    number: "02",
    titleLine1: "Casa",
    titleLine2: "Serena",
  },
  {
    image: "/images/project-03.svg",
    imageAlt: "Proyecto ficticio Forma Studio",
    category: "Identidad digital",
    number: "03",
    titleLine1: "Forma",
    titleLine2: "Studio",
  },
  {
    image: "/images/project-04.svg",
    imageAlt: "Proyecto ficticio Línea Privada",
    category: "Producto privado",
    number: "04",
    titleLine1: "Línea",
    titleLine2: "Privada",
  },
  {
    image: "/images/project-05.svg",
    imageAlt: "Proyecto ficticio Nueve Casas",
    category: "Campaña editorial",
    number: "05",
    titleLine1: "Nueve",
    titleLine2: "Casas",
  },
  {
    image: "/images/project-06.svg",
    imageAlt: "Proyecto ficticio Umbral",
    category: "Experiencia web",
    number: "06",
    titleLine1: "Umbral",
    titleLine2: "Living",
  },
  {
    image: "/images/project-07.svg",
    imageAlt: "Proyecto ficticio Reference Intelligence",
    category: "Producto digital",
    number: "07",
    titleLine1: "Reference",
    titleLine2: "Intelligence",
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
          <SectionLabel number="03">Proyectos seleccionados</SectionLabel>
          <h2>
            Explora
            <br />
            <em>el trabajo</em>
          </h2>
          <p>Una colección de casos ficticios creados específicamente para esta reconstrucción técnica.</p>
          <div className={styles.progress}>
            <span data-project-current>01</span>
            <i>
              <b data-project-progress-bar />
            </i>
            <span>07</span>
          </div>
        </div>
        <div ref={viewportRef} className={styles.viewport} data-horizontal-viewport>
          <div ref={trackRef} className={styles.track} data-horizontal-track>
            {PROJECTS.map((project) => (
              <article key={project.number} className={styles.card} data-project-card data-cursor="Abrir">
                <div className={styles.media}>
                  <img src={project.image} alt={project.imageAlt} />
                </div>
                <div className={styles.meta}>
                  <span>{project.category}</span>
                  <span>{project.number}</span>
                </div>
                <h3>
                  {project.titleLine1}
                  <br />
                  {project.titleLine2}
                </h3>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
