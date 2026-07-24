import { SectionLabel } from "@/ui/primitives/SectionLabel";
import styles from "./Process.module.css";

type Step = {
  number: string;
  title: string;
  description: string;
};

// Puerto literal de los 4 <article> de .process__grid en index.html.
const STEPS: Step[] = [
  {
    number: "01",
    title: "Descubrir",
    description: "Analizamos el negocio, la audiencia y el contexto antes de tomar una decisión visual.",
  },
  {
    number: "02",
    title: "Definir",
    description: "Ordenamos prioridades y fijamos una dirección capaz de sostener todo el sistema.",
  },
  {
    number: "03",
    title: "Diseñar",
    description: "Convertimos la estrategia en composición, interacción, contenido y movimiento.",
  },
  {
    number: "04",
    title: "Desarrollar",
    description: "Construimos, probamos y afinamos hasta que cada detalle responde con precisión.",
  },
];

// Sección estática (sin sticky, sin parallax, sin scroll-driven motion):
// el original no le aplica ninguna lógica de main.js más allá de estar en
// la lista de "secciones oscuras" (ver data-header-tone abajo). La
// secuencia de brújula/sticky de "De la idea al lanzamiento" pertenece a
// una sección distinta y posterior (.brand-story, fase 10), no a esta.
export function Process() {
  return (
    // data-header-tone="dark": Process está en la lista original de
    // "secciones oscuras" de main.js (.solutions, .process, .work-zoom,
    // .contact, .site-footer), igual que Solutions (fase 6).
    <section className={styles.process} id="proceso" data-header-tone="dark">
      <div className={styles.texture} aria-hidden="true" />
      <SectionLabel number="04" light>
        Proceso creativo
      </SectionLabel>
      <div className={styles.headline}>
        <p>La excelencia está</p>
        <h2>
          en los <em>detalles</em>
        </h2>
      </div>
      <div className={styles.grid}>
        {STEPS.map((step) => (
          <article key={step.number}>
            <span>{step.number}</span>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
