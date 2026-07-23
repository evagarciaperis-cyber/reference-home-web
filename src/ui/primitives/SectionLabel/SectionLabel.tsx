import styles from "./SectionLabel.module.css";

type SectionLabelProps = {
  number: string;
  light?: boolean;
  children: React.ReactNode;
};

// Primitivo compartido (docs/ARQUITECTURA.md, sección 5) — usado por el
// original en manifesto, solutions, projects, process, work-zoom,
// principles y contact. Manifesto (fase 5) es el primer consumidor real.
export function SectionLabel({ number, light, children }: SectionLabelProps) {
  return (
    <div className={light ? `${styles.label} ${styles.light}` : styles.label}>
      <span>{number}</span> {children}
    </div>
  );
}
