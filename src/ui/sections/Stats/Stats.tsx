"use client";

import { useSplitReveal } from "@/motion/hooks/useSplitReveal";
import { useCounter } from "@/motion/hooks/useCounter";
import styles from "./Stats.module.css";

// Puerto literal del texto de .stats__statement (index.html).
const STATEMENT = "Diseñamos para convertir atención en confianza y confianza en acción.";
const STATEMENT_WORDS = STATEMENT.split(/\s+/);

type Stat = {
  count: number;
  label: string;
};

// Puerto literal de los 4 <article> de .stats__grid.
const STATS: Stat[] = [
  { count: 45, label: "Componentes reutilizables" },
  { count: 7, label: "Casos visuales originales" },
  { count: 100, label: "% responsive" },
  { count: 0, label: "Dependencias obligatorias" },
];

// Puerto literal de la sección .stats: no está en la lista de "secciones
// oscuras" de main.js, así que no lleva data-header-tone. data-stats y
// data-stats-grid son atributos nuevos, solo para identificación estable
// en tests -- el original no tenía id ni data-* propios en este nivel.
export function Stats() {
  const statementRef = useSplitReveal<HTMLDivElement>();
  const gridRef = useCounter<HTMLDivElement>();

  return (
    <section className={styles.stats} data-stats>
      <div className={styles.statement} ref={statementRef}>
        {/* El original une los <span> con join(' '), insertando un espacio
            real entre ellos -- .map() de React no lo hace solo (mismo
            ajuste que Manifesto, fase 5). */}
        {STATEMENT_WORDS.flatMap((word, i) => [
          <span key={`word-${i}`} className={styles.word} data-word>
            {word}
          </span>,
          " ",
        ])}
      </div>
      <div className={styles.grid} ref={gridRef} data-stats-grid>
        {STATS.map((stat) => (
          <article key={stat.label}>
            <strong data-count={stat.count}>0</strong>
            <span>{stat.label}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
