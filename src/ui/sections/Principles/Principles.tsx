"use client";

import { SectionLabel } from "@/ui/primitives/SectionLabel";
import { useReveal } from "@/motion/hooks/useReveal";
import styles from "./Principles.module.css";

type Principle = {
  number: string;
  title: string;
  description: string;
};

// Puerto literal de los 4 <article data-reveal> de .principles__list.
const PRINCIPLES: Principle[] = [
  {
    number: "01",
    title: "Más claridad",
    description: "Jerarquías que permiten comprender rápido y decidir con seguridad.",
  },
  {
    number: "02",
    title: "Más valor",
    description: "Una presencia digital capaz de sostener una percepción verdaderamente premium.",
  },
  {
    number: "03",
    title: "Más control",
    description: "Un sistema editable y preparado para crecer sin perder coherencia.",
  },
  {
    number: "04",
    title: "Más identidad",
    description: "Una marca reconocible incluso antes de leer el logotipo.",
  },
];

// Puerto literal de la sección .principles: no está en la lista de
// "secciones oscuras" de main.js (a diferencia de Solutions/Process), así
// que no lleva data-header-tone -- el header permanece en su estado claro
// por defecto al pasar por aquí, igual que en el original. data-principles
// y data-reveal-list (ver abajo) son atributos nuevos, solo para que los
// tests puedan identificar la sección/lista sin depender de nombres de
// clase con hash de CSS Modules -- el original no tenía id ni
// data-* propios en este nivel.
export function Principles() {
  const listRef = useReveal<HTMLDivElement>();

  return (
    <section className={styles.principles} data-principles>
      <SectionLabel number="07">Principios</SectionLabel>
      <div className={styles.title}>
        <p>Una experiencia no se mide por cuánto se mueve,</p>
        <h2>
          sino por <em>cómo guía.</em>
        </h2>
      </div>
      <div className={styles.list} ref={listRef} data-reveal-list>
        {PRINCIPLES.map((principle) => (
          <article key={principle.number} data-reveal>
            <span>{principle.number}</span>
            <h3>{principle.title}</h3>
            <p>{principle.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
