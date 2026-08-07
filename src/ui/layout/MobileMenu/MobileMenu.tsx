"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { requestHeaderToneRefresh } from "@/motion/core/events";
import styles from "./MobileMenu.module.css";

type MobileMenuLink = { href: string; label: string; index: string };

// Mismas rutas que la navegación de escritorio (ver Header.tsx, incluido
// el motivo de prefetch:false en las tres que aún no existen -- y por qué
// "Vender en Valencia" no lo lleva: ruta real, ya creada).
const LINKS: MobileMenuLink[] = [
  { href: "/", label: "Inicio", index: "01" },
  { href: "/nosotros", label: "Nosotros", index: "02" },
  { href: "/proyectos", label: "Proyectos", index: "03" },
  { href: "/inmobiliaria-valencia", label: "Vender en Valencia", index: "04" },
  { href: "/contacto", label: "Contacto", index: "05" },
];

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
};

export function MobileMenu({ open, onClose }: MobileMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Recalcula el tono del header cuando el panel TERMINA de asentarse
  // (transitionend sobre su propio transform), no en el instante en que
  // cambia `open` -- en ese instante el panel todavía está fuera de
  // pantalla (translateY(-105%), transición de .8s en curso) y su rect
  // no cubre el punto de muestreo de useHeaderState.ts (SAMPLE_Y), así
  // que un refresh inmediato leería la posición equivocada. Cubre tanto
  // apertura como cierre con el mismo listener. Bajo
  // prefers-reduced-motion la transición sigue existiendo (solo se
  // acorta a .01ms globalmente, ver reset.css), así que transitionend
  // sigue disparándose con normalidad.
  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const handleTransitionEnd = (event: TransitionEvent) => {
      if (event.propertyName === "transform") requestHeaderToneRefresh();
    };
    el.addEventListener("transitionend", handleTransitionEnd);
    return () => el.removeEventListener("transitionend", handleTransitionEnd);
  }, []);

  return (
    <div
      id="mobile-menu"
      ref={menuRef}
      className={open ? `${styles.mobileMenu} ${styles.isOpen}` : styles.mobileMenu}
      aria-hidden={!open}
      // Mismo mecanismo genérico de auto-declaración que usa el resto del
      // sitio (WorkZoom, MarketingReel, BrandPause -- useHeaderState.ts):
      // el header no sabe nada de este menú, solo escanea
      // [data-header-tone="dark"]. Se marca únicamente mientras open=true
      // -- coherencia visual (logo/texto en blanco) sobre el nuevo fondo
      // #4A5D5A del menú, sea cual sea la sección que quedó detrás al
      // abrirlo.
      data-header-tone={open ? "dark" : undefined}
    >
      <div className={styles.inner}>
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            prefetch={link.href === "/" || link.href === "/inmobiliaria-valencia" ? undefined : false}
            onClick={onClose}
          >
            {link.label} <span>{link.index}</span>
          </Link>
        ))}
        <p>
          Reference Home
          <br />
          Valencia, España
        </p>
      </div>
    </div>
  );
}
