"use client";

import Link from "next/link";
import { useHeaderState } from "@/motion/hooks/useHeaderState";
import styles from "./Header.module.css";

type HeaderProps = {
  menuOpen: boolean;
  onToggleMenu: () => void;
};

const cx = (...classes: Array<string | false | undefined>) => classes.filter(Boolean).join(" ");

// Rutas por página estática original (docs/ARQUITECTURA.md, sección 7):
// index.html -> /, nosotros.html -> /nosotros, proyectos.html -> /proyectos,
// contacto.html -> /contacto. Esas páginas aún no existen (fases futuras),
// igual que en el oráculo, donde los .html correspondientes están vacíos.
export function Header({ menuOpen, onToggleMenu }: HeaderProps) {
  const { isScrolled, isHidden, isOnDark } = useHeaderState(menuOpen);

  return (
    <header
      className={cx(styles.header, isScrolled && styles.isScrolled, isHidden && styles.isHidden, isOnDark && styles.onDark)}
      data-header
    >
      <Link className={styles.brand} href="/" aria-label="Volver al inicio">
        <span className={styles.brandWord}>REFERENCE</span>
        <span className={styles.brandSub}>DIGITAL STUDY</span>
      </Link>

      <div className={styles.headerMeta}>
        Based in <strong>Valencia</strong>
      </div>

      <nav className={styles.desktopNav} aria-label="Navegación principal">
        <Link href="/">Inicio</Link>
        <Link href="/nosotros">Nosotros</Link>
        <Link href="/proyectos">
          Proyectos <sup>07</sup>
        </Link>
        <Link href="/contacto">Contacto</Link>
      </nav>

      <button
        className={styles.menuToggle}
        type="button"
        aria-expanded={menuOpen}
        aria-controls="mobile-menu"
        onClick={onToggleMenu}
      >
        <span>Menú</span>
        <i />
        <i />
      </button>
    </header>
  );
}
