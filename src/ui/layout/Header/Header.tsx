"use client";

import Link from "next/link";
import Image from "next/image";
import { useHeaderState } from "@/motion/hooks/useHeaderState";
import logoBlanco from "../../../../images/logo-blanco.png";
import logoRojo from "../../../../images/logo-rojo.png";
import styles from "./Header.module.css";

type HeaderProps = {
  menuOpen: boolean;
  onToggleMenu: () => void;
};

const cx = (...classes: Array<string | false | undefined>) => classes.filter(Boolean).join(" ");

// Rutas por página estática original (docs/ARQUITECTURA.md, sección 7):
// index.html -> /, nosotros.html -> /nosotros, proyectos.html -> /proyectos,
// contacto.html -> /contacto. Esas tres aún no existen (fases futuras),
// igual que en el oráculo, donde los .html correspondientes están vacíos.
// prefetch={false} en esas tres: sin él, next/link las precarga en
// segundo plano en cuanto entran en el viewport y genera 404 reales en
// consola (detectado en la fase 15 al revisar errores de consola) -- no
// es un comportamiento del original (sitio estático sin prefetch), es un
// artefacto propio de Next.js con rutas que aún no existen. No cambia la
// navegación real: al hacer click, sigue yendo a la 404 tal cual debe.
//
// "Vender en Valencia" (/inmobiliaria-valencia, 2026-08-05) es distinta:
// no es del oráculo original, es una página real y nueva del proyecto
// (docs/INMOBILIARIA_VALENCIA_MASTERPLAN.md), con su propia ruta ya
// creada (src/app/inmobiliaria-valencia/page.tsx) -- por eso lleva
// prefetch por defecto, como Inicio, y no el prefetch={false} de las
// tres pendientes.
export function Header({ menuOpen, onToggleMenu }: HeaderProps) {
  const { isScrolled, isOnDark, isHidden, isTransparent } = useHeaderState();

  return (
    <>
      {/* Franja invisible que revela el header en desktop al pasar el
          cursor por arriba (useHeaderState.ts) -- vive FUERA de
          <header>: .header usa transform para ocultarse (.isHidden), y
          cualquier position:fixed dentro de un ancestro con transform
          queda "capturado" por él (se mueve junto al padre en vez de
          anclarse al viewport) -- si esta franja estuviera dentro,
          desaparecería junto al header y ya no podría revelarlo. */}
      <div className={styles.hoverZone} data-header-hover-zone aria-hidden="true" />
      <header
        className={cx(
          styles.header,
          isScrolled && styles.isScrolled,
          isOnDark && styles.onDark,
          isHidden && styles.isHidden,
          isTransparent && styles.isTransparent,
        )}
        data-header
      >
        <Link className={styles.brand} href="/" aria-label="Volver al inicio">
          {/* 2026-07-28: dos logos apilados (blanco/rojo) en vez de un único
              asset con filtro CSS -- se cruzan en opacidad según el tono de
              la escena bajo el header (isOnDark, useHeaderState.ts), nunca
              por luminosidad automática del contenido de fondo. Mismo
              selector .onDark ya usado para el color del texto del header
              (ver Header.module.css). Solo el logo visible queda expuesto al
              árbol de accesibilidad. */}
          <span className={styles.brandLogoStack}>
            <Image
              src={logoBlanco}
              alt="Reference Home"
              fill
              sizes="(max-width: 640px) 145px, (max-width: 1024px) 165px, 190px"
              aria-hidden={!isOnDark}
              className={cx(styles.brandLogo, styles.brandLogoWhite)}
            />
            <Image
              src={logoRojo}
              alt="Reference Home"
              fill
              sizes="(max-width: 640px) 145px, (max-width: 1024px) 165px, 190px"
              loading="eager"
              fetchPriority="high"
              aria-hidden={isOnDark}
              className={cx(styles.brandLogo, styles.brandLogoRed)}
            />
          </span>
        </Link>

        <nav className={styles.desktopNav} aria-label="Navegación principal">
          <Link href="/">Inicio</Link>
          <Link href="/nosotros" prefetch={false}>
            Nosotros
          </Link>
          <Link href="/proyectos" prefetch={false}>
            Proyectos <sup>07</sup>
          </Link>
          <Link href="/inmobiliaria-valencia">Vender en Valencia</Link>
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
    </>
  );
}
