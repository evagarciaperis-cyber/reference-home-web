import styles from "./NoiseOverlay.module.css";

// Puramente presentacional — sin lógica, sin "use client".
export function NoiseOverlay() {
  return <div className={styles.noise} aria-hidden="true" data-shell="noise" />;
}
