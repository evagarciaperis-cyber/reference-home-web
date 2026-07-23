"use client";

import { useCallback, useEffect, useState } from "react";
import { Header } from "../Header";
import { MobileMenu } from "../MobileMenu";

/**
 * Compone Header (barra de navegación) y MobileMenu (overlay a pantalla
 * completa), dueño único del estado de apertura que ambos comparten —
 * sustituye la lectura/escritura directa de atributos DOM
 * (aria-expanded, aria-hidden, clases) del script original por estado de
 * React, incluido el bloqueo de scroll del body mientras el menú está
 * abierto (antes: document.body.classList.toggle('no-scroll', open)).
 *
 * Header y MobileMenu siguen siendo componentes independientes y se
 * pueden usar sueltos (p. ej. en tests o storybook) pasando sus props
 * directamente; SiteHeader es solo el ensamblaje listo para usar en el
 * layout raíz.
 */
export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("no-scroll", menuOpen);
    return () => {
      document.body.classList.remove("no-scroll");
    };
  }, [menuOpen]);

  const toggleMenu = useCallback(() => setMenuOpen((open) => !open), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  return (
    <>
      <Header menuOpen={menuOpen} onToggleMenu={toggleMenu} />
      <MobileMenu open={menuOpen} onClose={closeMenu} />
    </>
  );
}
