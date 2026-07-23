"use client";

import { useState } from "react";
import { SectionLabel } from "@/ui/primitives/SectionLabel";
import styles from "./Solutions.module.css";

type Service = {
  number: string;
  title: string;
  description: string;
  items: string[];
  time: string;
  image: string;
  imageAlt: string;
};

// Puerto literal de los 4 <article class="service"> de index.html.
const SERVICES: Service[] = [
  {
    number: "(01)",
    title: "Dirección digital",
    description:
      "Convertimos objetivos de negocio en una experiencia digital coherente, medible y preparada para evolucionar.",
    items: ["Arquitectura de experiencia", "Dirección creativa", "Sistema visual escalable"],
    time: "2 — 4 semanas",
    image: "/images/service-direction.svg",
    imageAlt: "Composición abstracta de dirección digital",
  },
  {
    number: "(02)",
    title: "Desarrollo web",
    description:
      "Desarrollamos interfaces rápidas y precisas, con animación al servicio del relato y una base fácil de mantener.",
    items: ["Frontend responsive", "Interacciones y scroll", "Optimización técnica"],
    time: "4 — 8 semanas",
    image: "/images/service-development.svg",
    imageAlt: "Composición abstracta de desarrollo web",
  },
  {
    number: "(03)",
    title: "Identidad de marca",
    description:
      "Definimos un lenguaje reconocible que ordena la comunicación y eleva la percepción de cada punto de contacto.",
    items: ["Dirección de arte", "Tipografía y color", "Guía de implementación"],
    time: "3 — 6 semanas",
    image: "/images/service-brand.svg",
    imageAlt: "Composición abstracta de identidad de marca",
  },
  {
    number: "(04)",
    title: "Contenido editorial",
    description: "Creamos sistemas de contenido que mantienen la marca activa sin perder consistencia ni intención.",
    items: ["Concepto editorial", "Campañas y lanzamientos", "Biblioteca de formatos"],
    time: "Continuo",
    image: "/images/service-editorial.svg",
    imageAlt: "Composición abstracta de contenido editorial",
  },
];

const cx = (...classes: Array<string | false | undefined>) => classes.filter(Boolean).join(" ");

// Puerto literal del bloque [data-service] de main.js: acordeón de
// apertura única. El original cierra todos los paneles y solo reabre el
// pulsado si no estaba ya activo -- aquí es exactamente el mismo efecto
// con un único índice de estado (null cierra todos).
export function Solutions() {
  const [activeIndex, setActiveIndex] = useState<number | null>(0);

  return (
    // data-header-tone="dark": Solutions está en la lista original de
    // "secciones oscuras" de main.js (.solutions, .process, .work-zoom,
    // .contact, .site-footer) -- con esto, Header (fase 3) la detecta sin
    // que haya que tocar useHeaderState. Primera sección que activa de
    // verdad este mecanismo.
    <section className={styles.solutions} id="soluciones" data-header-tone="dark">
      <div className={styles.header}>
        <SectionLabel number="02" light>
          Lo que creamos
        </SectionLabel>
        <h2>
          <span>Soluciones</span>
          <span>que dan</span>
          <em>resultado</em>
        </h2>
      </div>
      <div className={styles.services}>
        {SERVICES.map((service, i) => {
          const isActive = activeIndex === i;
          return (
            <article key={service.title} className={cx(styles.service, isActive && styles.isActive)}>
              <button type="button" aria-expanded={isActive} onClick={() => setActiveIndex(isActive ? null : i)}>
                <span className={styles.number}>{service.number}</span>
                <span className={styles.title}>{service.title}</span>
                <span className={styles.icon}>↗</span>
              </button>
              <div className={styles.panel}>
                <div className={styles.copy}>
                  <p>{service.description}</p>
                  <ul>
                    {service.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <span className={styles.time}>{service.time}</span>
                </div>
                <img src={service.image} alt={service.imageAlt} />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
