"use client";

import Link from "next/link";
import styles from "./MobileMenu.module.css";

type MobileMenuLink = { href: string; label: string; index: string };

// Mismas rutas que la navegación de escritorio (ver Header.tsx).
const LINKS: MobileMenuLink[] = [
  { href: "/", label: "Inicio", index: "01" },
  { href: "/nosotros", label: "Nosotros", index: "02" },
  { href: "/proyectos", label: "Proyectos", index: "03" },
  { href: "/contacto", label: "Contacto", index: "04" },
];

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
};

export function MobileMenu({ open, onClose }: MobileMenuProps) {
  return (
    <div
      id="mobile-menu"
      className={open ? `${styles.mobileMenu} ${styles.isOpen}` : styles.mobileMenu}
      aria-hidden={!open}
    >
      <div className={styles.inner}>
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} onClick={onClose}>
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
