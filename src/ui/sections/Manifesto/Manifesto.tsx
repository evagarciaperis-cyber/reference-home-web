"use client";

import { SectionLabel } from "@/ui/primitives/SectionLabel";
import { Eyebrow } from "@/ui/primitives/Eyebrow";
import { useSplitReveal } from "@/motion/hooks/useSplitReveal";
import { useParallax } from "@/motion/hooks/useParallax";
import styles from "./Manifesto.module.css";

// Puerto literal del texto de .manifesto__statement (index.html). El
// original genera los <span class="word"> por JS a partir del
// textContent; aquí se parte directamente el string fuente, con el mismo
// resultado (mismas palabras, mismo orden).
const STATEMENT =
  "Hacer crecer una marca exige criterio. Creamos sistemas visuales que convierten cada desplazamiento en una decisión y cada detalle en una señal de calidad.";
const STATEMENT_WORDS = STATEMENT.split(/\s+/);

export function Manifesto() {
  const statementRef = useSplitReveal<HTMLDivElement>();
  const visualRef = useParallax<HTMLDivElement>(0.08);

  return (
    <section className={styles.manifesto} id="estudio">
      <SectionLabel number="01">El estudio</SectionLabel>
      <div className={styles.grid}>
        <Eyebrow>Una arquitectura pensada para avanzar</Eyebrow>
        <div className={styles.statement} ref={statementRef}>
          {/* El original une los <span> con join(' '), insertando un
              espacio real entre ellos -- .map() de React no lo hace solo. */}
          {STATEMENT_WORDS.flatMap((word, i) => [
            <span key={`word-${i}`} className={styles.word} data-word>
              {word}
            </span>,
            " ",
          ])}
        </div>
      </div>
      <div className={styles.visual}>
        <div className={styles.frame} ref={visualRef}>
          <img src="/images/studio-object.svg" alt="Composición digital abstracta creada para el proyecto" />
          <div className={styles.caption}>
            <span>Objeto digital 01</span>
            <span>Valencia — 2026</span>
          </div>
        </div>
        <div className={styles.aside}>
          <p>No acumulamos efectos. Construimos ritmo, jerarquía y tensión visual para que la experiencia tenga dirección.</p>
          <a className={styles.textLink} href="#proceso">
            Conoce el proceso <span>↗</span>
          </a>
        </div>
      </div>
    </section>
  );
}
