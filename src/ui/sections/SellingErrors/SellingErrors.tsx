"use client";

import { useSellingErrors } from "@/motion/hooks/useSellingErrors";
import styles from "./SellingErrors.module.css";

type Chapter = {
  number: string;
  title: string;
  body: string;
};

// Los cuatro capítulos son un puerto literal del copy aprobado en esta
// ronda (2026-07-28) -- narrativa/tipografía en fase de aprobación, el
// fondo visual y cualquier objeto 3D quedan aplazados a una fase
// posterior.
//
// 2026-07-30: la ronda de imágenes (banda inferior, luego fondo fotográfico
// a pantalla completa) se retiró por completo -- no aprobada. Vuelta a la
// arquitectura de referencia de Lenis, solo tipografía: número/título/
// descripción de la columna derecha crecen en escala en su lugar.
const CHAPTERS: Chapter[] = [
  {
    number: "01",
    title: "Precio mal definido",
    body: "El error más caro al vender. Tu vivienda se queda fuera del mercado.",
  },
  {
    number: "02",
    title: "Sin estrategia",
    body: "Publicar no es vender. Sin un plan, tu vivienda se pierde entre miles de anuncios.",
  },
  {
    number: "03",
    title: "Compradores no cualificados",
    body: "Visitas que no llevan a nada. Solo hacen perder tiempo y desgastan la negociación.",
  },
  {
    number: "04",
    title: "Negociación débil",
    body: "Cada error cuesta dinero. Sin experiencia, puedes perder miles de euros en el cierre.",
  },
];

// Sección añadida inmediatamente después de la salida escalonada de
// MarketingReel (ver page.tsx) -- no sustituye ni elimina ningún bloque
// existente. Arquitectura de referencia: "Why smooth scroll?" de Lenis
// (título fijo a la izquierda + columna derecha que asciende), sin copiar
// su estética (sin fondo negro/rosa, sin objeto 3D, sin partículas).
//
// 2026-07-28 (corrección de continuidad): comparte el mismo fondo
// beige/nude que el bloque de los tres vídeos (var(--paper)) -- ya no hay
// una capa de cortina/barrido de color que revelar, así que no existe
// ningún nodo de fondo propio aquí; .section ya lo pinta directamente
// (SellingErrors.module.css).
export function SellingErrors() {
  const {
    sectionRef,
    stageRef,
    labelRef,
    titleLine1Ref,
    titleLine2Ref,
    introRef,
    chapterRefs,
    earlyRevealRef,
    earlyLabelRef,
    earlyTitleLine1Ref,
    earlyTitleLine2Ref,
  } = useSellingErrors(CHAPTERS.length);

  return (
    <section className={styles.section} ref={sectionRef}>
      {/* Capa eco (2026-07-28): ver SellingErrors.module.css .earlyReveal.
          Duplica visualmente la etiqueta + título reales (mismas clases,
          mismo texto) para poder revelarse MIENTRAS el bloque de los tres
          vídeos todavía está saliendo -- .stage, más abajo, no puede
          hacerlo por sí solo (su pin no se activa hasta que el anterior
          libera el espacio). aria-hidden: es un eco visual, el contenido
          real (accesible) es el de dentro de .stage. */}
      <div className={styles.earlyReveal} ref={earlyRevealRef} aria-hidden="true">
        <div className={styles.labelRow} ref={earlyLabelRef}>
          <span className={styles.labelLine} aria-hidden="true" />
          <span className={styles.label}>Por qué una vivienda pierde oportunidades</span>
        </div>
        <h2 className={styles.title}>
          <span className={styles.titleLineMask}>
            <span className={styles.titleLine} ref={earlyTitleLine1Ref}>
              <span className={styles.titleLight}>No es</span> <span className={styles.titleSerif}>el mercado.</span>
            </span>
          </span>
          <span className={styles.titleLineMask}>
            <span className={styles.titleLine} ref={earlyTitleLine2Ref}>
              <span className={styles.titleMain}>Es cómo</span> <span className={styles.titleSerifItalic}>se vende.</span>
            </span>
          </span>
        </h2>
      </div>

      <div className={styles.stage} ref={stageRef}>
        <div className={styles.left}>
          <div className={styles.labelRow} ref={labelRef}>
            <span className={styles.labelLine} aria-hidden="true" />
            <span className={styles.label}>Por qué una vivienda pierde oportunidades</span>
          </div>

          <h2 className={styles.title}>
            <span className={styles.titleLineMask}>
              <span className={styles.titleLine} ref={titleLine1Ref}>
                <span className={styles.titleLight}>No es</span> <span className={styles.titleSerif}>el mercado.</span>
              </span>
            </span>
            <span className={styles.titleLineMask}>
              <span className={styles.titleLine} ref={titleLine2Ref}>
                <span className={styles.titleMain}>Es cómo</span> <span className={styles.titleSerifItalic}>se vende.</span>
              </span>
            </span>
          </h2>
        </div>

        <div className={styles.right}>
          <div className={styles.rightViewport}>
            <div className={styles.introBlock} ref={introRef}>
              <p className={styles.introText}>
                Una vivienda puede tener ubicación, calidad y demanda potencial. Pero si el precio, la estrategia, la selección del
                comprador o la negociación fallan, el mercado deja de responder.
              </p>
              <p className={styles.introClose}>Estos son los errores que más valor destruyen.</p>
            </div>

            {CHAPTERS.map((chapter, index) => (
              <article
                key={chapter.number}
                className={styles.chapter}
                ref={(el) => {
                  chapterRefs.current[index] = el;
                }}
                data-chapter-index={index}
              >
                <span className={styles.chapterNumber}>{chapter.number}</span>
                <h3 className={styles.chapterTitle}>{chapter.title}</h3>
                <p className={styles.chapterBody}>{chapter.body}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
