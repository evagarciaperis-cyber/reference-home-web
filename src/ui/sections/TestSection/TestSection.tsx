"use client";

import { useTestSectionCanvasReveal } from "@/motion/hooks/useTestSectionCanvasReveal";
import styles from "./TestSection.module.css";

// Bloque "valoración de vivienda" (2026-08-19) -- titular + mancha
// orgánica de varios lóbulos, con estela y disipación, que revela una
// imagen arquitectónica. Reescrito a Canvas 2D
// (useTestSectionCanvasReveal.ts): la versión anterior con
// `clip-path: ellipse()` + deformación por CSS, por mucho que se
// deformara, seguía leyéndose como una forma geométrica única (círculo/
// óvalo), no como una mancha líquida real. El propio canvas pinta la
// fotografía siempre nítida y la recorta con la máscara -- sin WebGL,
// sin Three.js.
//
// Texto blanco dentro de la mancha: desactivado a propósito en esta
// ronda (prioridad: mancha orgánica + nitidez de la foto, ver el hook).
// Solo queda el titular negro/burgundy normal, sin tocar.
export function TestSection() {
  const { sectionRef, canvasRef, onPointerEnter, onPointerMove, onPointerLeave } = useTestSectionCanvasReveal();

  return (
    <section
      ref={sectionRef}
      className={styles.section}
      onPointerEnter={onPointerEnter}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />

      <div className={styles.textLayer}>
        <span className={styles.micro}>Valoración de vivienda</span>
        <h2 className={styles.headline}>
          <span className={styles.headlineMain}>¿Quieres descubrir</span>
          <br />
          <span className={styles.headlineAccent}>cuánto vale tu casa?</span>
        </h2>
      </div>
    </section>
  );
}
