"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import { useMagnetic } from "@/motion/hooks/useMagnetic";
import logoBlanco from "../../../../images/logo-blanco.png";
import styles from "./FooterContact.module.css";

// Cierre único de la home: fusiona lo que antes eran Contact (sección
// independiente) y Footer (layout, hermano de <main>) en un solo
// <footer> semántico -- mensaje final + formulario + datos + navegación
// + legal + copyright + volver arriba, sin caja/panel/tarjeta separada.
// Sustituye por completo a src/ui/sections/Contact y src/ui/layout/Footer
// (ambos eliminados). Vive fuera de <main>, hermano suyo -- mismo lugar
// que ocupaba el Footer antiguo (ver page.tsx) -- así su posición natural
// en el documento cae justo donde termina el pin-spacer de BrandStory,
// sin necesidad de ningún posicionamiento fijo/JS propio: el revelado
// hacia arriba lo hace BrandStory (useBrandStory.ts), este componente
// permanece completamente estático.

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "1x00000000000000000000AA";

type TurnstileGlobal = { reset: (widget?: string | HTMLElement) => void };
function getTurnstile(): TurnstileGlobal | undefined {
  return (window as unknown as { turnstile?: TurnstileGlobal }).turnstile;
}

// Ya no apunta a send.php (stub sin backend real) -- ahora hay un endpoint
// propio (src/app/api/contact/route.ts) que valida el token de Turnstile
// en servidor vía Siteverify antes de aceptar el envío (punto 7 del
// pedido). Mismo contrato de respuesta {ok, message} que ya esperaba el
// código anterior, así que el resto de handleSubmit no cambia.
async function submitContactForm(form: HTMLFormElement): Promise<string> {
  const response = await fetch(form.action, {
    method: "POST",
    body: new FormData(form),
    headers: { Accept: "application/json" },
  });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.message || "No se pudo enviar.");
  return data.message as string;
}

const NAV_LINKS = [
  { label: "Inicio", href: "/" },
  { label: "Nosotros", href: "/nosotros" },
  { label: "Viviendas", href: "/inmuebles" },
  { label: "Servicios", href: "#proceso" },
  { label: "Contacto", href: "#contacto" },
];

const LEGAL_LINKS = [
  { label: "Aviso legal", href: "aviso-legal.html" },
  { label: "Política de privacidad", href: "privacidad.html" },
  { label: "Política de cookies", href: "cookies.html" },
];

// TODO: sustituir los "#" por las URLs reales de los perfiles en cuanto
// existan -- de momento no hay ninguna cuenta social del proyecto creada.
const SOCIAL_LINKS = [
  { label: "Instagram", href: "#" },
  { label: "Facebook", href: "#" },
  { label: "LinkedIn", href: "#" },
];

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Evita que los "#" placeholder salten al principio de la página mientras
// no haya una URL real detrás -- ver TODO junto a SOCIAL_LINKS.
function handleSocialClick(event: React.MouseEvent<HTMLAnchorElement>) {
  if (event.currentTarget.getAttribute("href") === "#") {
    event.preventDefault();
  }
}

function SocialIcon({ label }: { label: string }) {
  switch (label) {
    case "Instagram":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.3" cy="6.7" r="0.6" fill="currentColor" stroke="none" />
        </svg>
      );
    case "Facebook":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 21v-8h3l1-4h-4V6.5A1.5 1.5 0 0 1 16.5 5H19V1.5h-3A4.5 4.5 0 0 0 11.5 6v3h-3v4h3v8" />
        </svg>
      );
    case "LinkedIn":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="7.2" y1="9.5" x2="7.2" y2="17" />
          <circle cx="7.2" cy="6.3" r="0.6" fill="currentColor" stroke="none" />
          <path d="M11.2 17v-4.8a2.3 2.3 0 0 1 4.6 0V17" />
          <line x1="11.2" y1="9.5" x2="11.2" y2="12.2" />
        </svg>
      );
    default:
      return null;
  }
}

export function FooterContact() {
  const [status, setStatus] = useState("");
  const [disabled, setDisabled] = useState(false);
  const buttonRef = useMagnetic<HTMLButtonElement>();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus("Enviando…");
    setDisabled(true);
    try {
      const message = await submitContactForm(form);
      setStatus(message);
      form.reset();
      getTurnstile()?.reset();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Ha ocurrido un error.");
      // El widget debe reiniciarse tras un error -- un token ya
      // consumido/expirado no sirve para un segundo intento.
      getTurnstile()?.reset();
    } finally {
      setDisabled(false);
    }
  };

  return (
    <footer className={styles.footer} id="contacto" data-header-tone="dark">
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" async defer />

      <div className={styles.top}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Hablemos</p>
          <h2 className={styles.title}>Hablemos de tu vivienda.</h2>
          <p className={styles.accent}>Todo empieza por escucharte.</p>
          <p className={styles.support}>
            Cuéntanos qué necesitas. Te responderemos personalmente para valorar contigo el siguiente paso.
          </p>

          <address className={styles.details}>
            <p>Reference Home</p>
            <p>Reino de Valencia, 43 bajo</p>
            <p>46005 Valencia</p>
            <p>
              <a href="tel:+34963547596">963 547 596</a>
            </p>
            <p>
              <a href="mailto:reference@referencehome.es">reference@referencehome.es</a>
            </p>
          </address>
        </div>

        <form className={styles.form} action="/api/contact" method="post" data-contact-form onSubmit={handleSubmit}>
          <input type="text" name="company" className={styles.hp} tabIndex={-1} autoComplete="off" aria-hidden="true" />
          <div className={styles.formRow}>
            <label>
              <span>Nombre completo*</span>
              <input type="text" name="name" required autoComplete="name" />
            </label>
            <label>
              <span>Teléfono*</span>
              <input type="tel" name="phone" required autoComplete="tel" />
            </label>
          </div>
          <label>
            <span>Correo electrónico*</span>
            <input type="email" name="email" required autoComplete="email" />
          </label>
          <label>
            <span>Mensaje</span>
            <textarea name="message" rows={4} />
          </label>
          <label className={styles.consent}>
            <input type="checkbox" name="privacy" required />
            <span>
              Acepto la <a href="privacidad.html">política de privacidad</a>.
            </span>
          </label>

          <div className={styles.turnstileRow}>
            {/* size="normal" es más ancho (300px) pero mucho más bajo
                (~65px) que "compact" (~140px) -- con la columna del
                formulario teniendo sobra de ancho y el alto siendo el
                recurso escaso, este intercambio es lo que realmente
                libera altura, no los márgenes alrededor del widget. */}
            <div className="cf-turnstile" data-sitekey={TURNSTILE_SITE_KEY} data-theme="dark" data-size="normal" />
          </div>

          <button ref={buttonRef} className={styles.submitButton} type="submit" disabled={disabled}>
            <span>Enviar consulta</span>
            <i>↗</i>
          </button>
          <p className={styles.formStatus} role="status" aria-live="polite">
            {status}
          </p>
        </form>
      </div>

      <div className={styles.bottom}>
        <Link className={styles.brand} href="/" aria-label="Reference Home">
          <Image src={logoBlanco} alt="Reference Home" className={styles.brandLogo} />
        </Link>

        <nav className={styles.social} aria-label="Redes sociales">
          {SOCIAL_LINKS.map((link) => (
            <a key={link.label} href={link.href} aria-label={link.label} rel="noopener noreferrer" onClick={handleSocialClick}>
              <SocialIcon label={link.label} />
            </a>
          ))}
        </nav>

        <nav className={styles.nav} aria-label="Navegación">
          {NAV_LINKS.map((link) => (
            <Link key={link.label} href={link.href} prefetch={false}>
              {link.label}
            </Link>
          ))}
        </nav>

        <nav className={styles.legal} aria-label="Legal">
          {LEGAL_LINKS.map((link) => (
            <a key={link.label} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>

        <p className={styles.copyright}>
          © 2026 Reference Home <span>· Inmobiliaria en Valencia</span>
        </p>

        <button type="button" className={styles.backToTop} onClick={scrollToTop}>
          Volver arriba <span aria-hidden="true">↑</span>
        </button>
      </div>
    </footer>
  );
}
