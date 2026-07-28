"use client";

import { useParallax } from "@/motion/hooks/useParallax";
import { useManifestoRise } from "@/motion/hooks/useManifestoRise";
import { useWordReveal } from "@/motion/hooks/useWordReveal";
import { useAmbientLiquid } from "@/motion/hooks/useAmbientLiquid";
import styles from "./Manifesto.module.css";

// Réplica visual del bloque "En nuestra agencia" de Cosmosia (ver auditoría
// 2026-07-27), con la jerarquía tipográfica editorial aprobada sobre esa
// base (2026-07-27, segunda ronda): cada línea se declara ya partida (no
// es un reflow libre del texto). Cada palabra lleva una marca de énfasis
// -- ninguna familia nueva, solo variación de peso/tamaño/estilo dentro de
// las tres ya cargadas (sans, script, serif) -- ver EMPHASIS_CLASS más
// abajo para el mapeo a clases concretas. "comprador" y "valor" siguen
// siendo las únicas palabras en manuscrita (sin añadir más).
type Emphasis = "base400" | "base" | "light" | "heavy" | "heavyLarge" | "script" | "serifLarge" | "serifItalic";
type Token = { text: string; emphasis: Emphasis };

function words(text: string, emphasis: Emphasis): Token[] {
  return text.split(" ").map((text) => ({ text, emphasis }));
}

const LINE_GROUPS: { lines: Token[][]; break?: boolean }[] = [
  {
    lines: [
      words("Vender una vivienda", "base400"),
      words("no consiste únicamente", "light"),
      [...words("en encontrar un", "heavy"), { text: "comprador.", emphasis: "script" }],
    ],
  },
  {
    break: true,
    lines: [
      [...words("Consiste en", "light"), ...words("proteger su", "heavyLarge"), { text: "valor,", emphasis: "script" }],
      [...words("tomar las", "light"), { text: "decisiones", emphasis: "serifLarge" }, { text: "correctas", emphasis: "base" }],
      [...words("y saber defender", "light"), { text: "cada", emphasis: "serifItalic" }, { text: "oportunidad.", emphasis: "serifItalic" }],
    ],
  },
];

const EMPHASIS_CLASS: Record<Emphasis, string> = {
  base400: `${styles.word} ${styles.emphasisBase400}`,
  base: styles.word,
  light: `${styles.word} ${styles.emphasisLight}`,
  heavy: `${styles.word} ${styles.emphasisHeavy}`,
  heavyLarge: `${styles.word} ${styles.emphasisHeavyLarge}`,
  script: styles.wordScript,
  serifLarge: `${styles.word} ${styles.emphasisSerifLarge}`,
  serifItalic: `${styles.word} ${styles.emphasisSerifItalic}`,
};

function renderLine(tokens: Token[], lineKey: string) {
  return tokens.flatMap((token, i) => {
    const node = (
      <span key={`${lineKey}-word-${i}`} className={EMPHASIS_CLASS[token.emphasis]} data-word>
        {token.text}
      </span>
    );
    return i < tokens.length - 1 ? [node, " "] : [node];
  });
}

export function Manifesto() {
  const statementRef = useWordReveal<HTMLDivElement>();
  const visualRef = useParallax<HTMLDivElement>(0.08);
  const riseRef = useManifestoRise<HTMLElement>();
  const { containerRef: ambientRef, canvasRef: liquidCanvasRef } = useAmbientLiquid<HTMLDivElement>();

  return (
    <section className={styles.manifesto} id="estudio" ref={riseRef}>
      <div className={styles.textBlock} ref={ambientRef}>
        <canvas className={styles.liquidCanvas} ref={liquidCanvasRef} data-ambient-layer aria-hidden="true" />
        <div className={styles.preTitleRow}>
          <div className={styles.preTitleLabel}>
            <svg className={styles.preTitleIcon} viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2 L14.2 9.8 L22 12 L14.2 14.2 L12 22 L9.8 14.2 L2 12 L9.8 9.8 Z" fill="currentColor" />
            </svg>
            <span>En Reference Home</span>
          </div>
          <div className={styles.preTitleCopyright}>(© 2026)</div>
          <div className={styles.preTitleCoords}>Valencia — 39°28′11″N</div>
        </div>
        <div className={styles.statement} ref={statementRef}>
          {LINE_GROUPS.map((group, gi) => (
            <p key={`group-${gi}`} className={group.break ? styles.statementParagraphBreak : styles.statementParagraph}>
              {group.lines.map((line, li) => (
                <span key={`line-${gi}-${li}`}>
                  {renderLine(line, `${gi}-${li}`)}
                  {li < group.lines.length - 1 ? <br /> : null}
                </span>
              ))}
            </p>
          ))}
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
