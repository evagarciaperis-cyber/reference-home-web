"use client";

import Link from "next/link";
import Image from "next/image";
import { useHeaderState } from "@/motion/hooks/useHeaderState";
import logoBlanco from "../../../../images/logo-blanco.png";
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
// prefetch={false} en esas tres: sin él, next/link las precarga en
// segundo plano en cuanto entran en el viewport y genera 404 reales en
// consola (detectado en la fase 15 al revisar errores de consola) -- no
// es un comportamiento del original (sitio estático sin prefetch), es un
// artefacto propio de Next.js con rutas que aún no existen. No cambia la
// navegación real: al hacer click, sigue yendo a la 404 tal cual debe.
export function Header({ menuOpen, onToggleMenu }: HeaderProps) {
  const { isScrolled, isHidden, isOnDark } = useHeaderState(menuOpen);

  return (
    <header
      className={cx(styles.header, isScrolled && styles.isScrolled, isHidden && styles.isHidden, isOnDark && styles.onDark)}
      data-header
    >
      <Link className={styles.brand} href="/" aria-label="Volver al inicio">
        <Image src={logoBlanco} alt="Reference Home" width={130} height={44} className={styles.brandLogo} />
      </Link>

      <nav className={styles.desktopNav} aria-label="Navegación principal">
        <Link href="/">Inicio</Link>
        <Link href="/nosotros" prefetch={false}>
          Nosotros
        </Link>
        <Link href="/proyectos" prefetch={false}>
          Proyectos <sup>07</sup>
        </Link>
        <Link href="/contacto" prefetch={false}>
          Contacto
        </Link>
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
