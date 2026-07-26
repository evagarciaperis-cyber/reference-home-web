"use client";

import Image from "next/image";
import { usePreloaderReady } from "@/motion/PreloaderProvider";
import logoMark from "../../../../images/logo-R-cuadrado-blanco.png";
import styles from "./Preloader.module.css";

// data-shell="..." son enganches exclusivos para tests (e2e/shell.spec.ts):
// las clases de CSS Modules están hasheadas y no se pueden usar como
// selector estable. No afectan al diseño ni al comportamiento.
export function Preloader() {
  // El cálculo real vive en PreloaderProvider (fase 4): así Hero puede
  // consumir el mismo "ready" sin un segundo temporizador independiente.
  const ready = usePreloaderReady();

  return (
    <div
      className={ready ? `${styles.preloader} ${styles.isHidden}` : styles.preloader}
      aria-hidden="true"
      data-shell="preloader"
    >
      <div className={styles.mark}>
        {/* width/height explícitos: el archivo fuente es un export maestro
            de 9449x9449px, y sin esto Next.js intenta generar una variante
            de hasta 3840px bajo demanda -- ese redimensionado es lo que
            colgaba `window.load` (y con él la salida del preloader) en
            `next dev`. Aquí solo se pinta a <=96px (ver .mark). */}
        <Image src={logoMark} alt="" width={96} height={96} preload className={styles.markImage} />
      </div>
      <div className={styles.line}>
        <span data-shell="preloader-progress" />
      </div>
    </div>
  );
}
