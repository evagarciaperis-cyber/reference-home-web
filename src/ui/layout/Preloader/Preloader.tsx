"use client";

import { usePreloaderReady } from "@/motion/PreloaderProvider";
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
        R<span>H</span>
      </div>
      <div className={styles.line}>
        <span data-shell="preloader-progress" />
      </div>
    </div>
  );
}
