"use client";

import { useCustomCursor } from "@/motion/hooks/useCustomCursor";
import styles from "./CustomCursor.module.css";

// data-shell="..." son enganches exclusivos para tests (e2e/shell.spec.ts):
// las clases de CSS Modules están hasheadas y no se pueden usar como
// selector estable. No afectan al diseño ni al comportamiento.
export function CustomCursor() {
  const { cursorRef, labelRef, isVisible } = useCustomCursor();

  return (
    <div
      ref={cursorRef}
      className={isVisible ? `${styles.cursor} ${styles.isVisible}` : styles.cursor}
      aria-hidden="true"
      data-shell="cursor"
    >
      <span ref={labelRef} data-shell="cursor-label">
        Ver
      </span>
    </div>
  );
}
