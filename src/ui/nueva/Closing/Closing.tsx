"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { sendLead, STATIC_FORMS } from "@/lib/sendLead";
import styles from "./Closing.module.css";

/**
 * Cierre de la home: contacto + pie.
 *
 * Contacto en el verde de la marca: titular grande, datos de las dos
 * oficinas y un formulario corto que envía a /api/contact (Turnstile).
 * Pie sobrio en cuatro columnas (marca, servicios, empresa, redes).
 * Incluye los datos estructurados (RealEstateAgent) para Google.
 */

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "1x00000000000000000000AA";

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  name: "Reference Home",
  url: "https://referencehome.es/",
  telephone: "+34963547596",
  email: "reference@referencehome.es",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Reino de Valencia, 43 bajo",
    postalCode: "46005",
    addressLocality: "Valencia",
    addressRegion: "Valencia",
    addressCountry: "ES",
  },
  areaServed: ["Valencia", "Ruzafa", "Benimaclet", "Ensanche", "Campanar", "Patraix"],
  openingHours: ["Mo-Fr 09:30-14:00", "Mo-Fr 16:30-20:00"],
  sameAs: [
    "https://www.instagram.com/inmobiliariareferencehome/",
    "https://www.facebook.com/referencecomprarcasa",
    "https://www.youtube.com/channel/UCv7G5UovIrhO8VsCLsGVuFg",
  ],
};

type Status = { kind: "idle" | "sending" | "ok" | "error"; message?: string };

export function Closing() {
  const footRef = useRef<HTMLElement>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  useEffect(() => {
    const foot = footRef.current;
    if (!foot) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const r = foot.getBoundingClientRect();
      if (r.top > window.innerHeight + 50) return;
      const p = reduced ? 1 : Math.min(1, Math.max(0, (window.innerHeight - r.top) / r.height));
      foot.style.setProperty("--p", p.toFixed(3));
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    setStatus({ kind: "sending" });
    try {
      await sendLead(new FormData(form), "home-contacto");
      setStatus({ kind: "ok", message: "Gracias. Te llamamos muy pronto." });
      form.reset();
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "No se pudo enviar. Inténtalo de nuevo." });
    }
    (window as unknown as { turnstile?: { reset: () => void } }).turnstile?.reset();
  };

  return (
    <>
      {!STATIC_FORMS && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="lazyOnload" />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />

      <section className={styles.contact} id="contacto" aria-labelledby="contact-title" data-header-tone="dark">
        <div className={styles.inner}>
          <div className={styles.left}>
            <p className={styles.kicker}>Contacto</p>
            <h2 id="contact-title" className={styles.title}>
              Hablemos de <em>tu vivienda.</em>
            </h2>
            <p className={styles.lead}>Cuéntanos qué necesitas. Te responde una persona del equipo, no una centralita.</p>

            <div className={styles.channels}>
              <a href="tel:+34963547596">
                <span>Llámanos</span>963 547 596
              </a>
              <a href="https://wa.me/34674612272" target="_blank" rel="noopener noreferrer">
                <span>WhatsApp</span>674 61 22 72
              </a>
              <a href="mailto:reference@referencehome.es">
                <span>Escríbenos</span>reference@referencehome.es
              </a>
            </div>

            <div className={styles.offices}>
              <div>
                <h3>Valencia</h3>
                <p>
                  Reino de Valencia, 43 bajo
                  <br />
                  46005 Valencia
                </p>
              </div>
              <div>
                <h3>Llombai</h3>
                <p>Carrer Catadau, 9</p>
              </div>
              <div>
                <h3>Horario</h3>
                <p>
                  Lunes a viernes
                  <br />
                  9:30–14:00 y 16:30–20:00
                </p>
              </div>
            </div>
          </div>

          <form className={styles.form} onSubmit={onSubmit} noValidate>
            <input type="text" name="company" tabIndex={-1} autoComplete="off" className={styles.hp} aria-hidden="true" />
            <div className={styles.row}>
              <label className={styles.field} htmlFor="c-name">
                <span>Nombre</span>
                <input id="c-name" name="name" required autoComplete="name" />
              </label>
              <label className={styles.field} htmlFor="c-phone">
                <span>Teléfono</span>
                <input id="c-phone" name="phone" type="tel" required autoComplete="tel" inputMode="tel" />
              </label>
            </div>
            <label className={styles.field} htmlFor="c-email">
              <span>Email</span>
              <input id="c-email" name="email" type="email" required autoComplete="email" />
            </label>
            <fieldset className={styles.topics}>
              <legend>Me interesa</legend>
              {["Vender", "Comprar", "Alquilar", "Asesoría"].map((t, i) => (
                <label key={t} className={styles.topic}>
                  <input type="radio" name="topic" value={t} defaultChecked={i === 0} />
                  <span>{t}</span>
                </label>
              ))}
            </fieldset>
            <label className={styles.field} htmlFor="c-message">
              <span>Mensaje (opcional)</span>
              <textarea id="c-message" name="message" rows={3} />
            </label>
            <label className={styles.check} htmlFor="c-privacy">
              <input id="c-privacy" name="privacy" type="checkbox" required />
              <span>
                Acepto la <a href="/política-privacidad">política de privacidad</a>
              </span>
            </label>
            {!STATIC_FORMS && <div className="cf-turnstile" data-sitekey={TURNSTILE_SITE_KEY} data-size="flexible" data-theme="dark" />}
            <button type="submit" className={styles.submit} disabled={status.kind === "sending"}>
              {status.kind === "sending" ? "Enviando…" : "Enviar"} <span aria-hidden="true">→</span>
            </button>
            <p className={styles.status} role="status" data-kind={status.kind}>
              {status.message}
            </p>
          </form>
        </div>
      </section>

      <footer ref={footRef} className={styles.foot}>
        <div className={styles.footGrid}>
          <div className={styles.brandCol}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.logo} src="/nueva/logo-blanco.png" alt="Reference Home" width={1600} height={229} />
            <p>Asesoría inmobiliaria en Valencia desde la confianza y el criterio.</p>
          </div>
          <nav className={styles.col} aria-label="Servicios">
            <h3>Servicios</h3>
            <a href="/quieres-vender">Vender</a>
            <a href="/quieres-comprar">Comprar</a>
            <a href="/quieres-vender/valoracion">Valoración gratis</a>
            <a href="/inmobiliaria-valencia">Inmobiliaria en Valencia</a>
          </nav>
          <nav className={styles.col} aria-label="Reference Home">
            <h3>Reference Home</h3>
            <a href="/empresa/nosotros">Nosotros</a>
            <a href="/empresa/ser-agente">Trabaja con nosotros</a>
            <a href="/contacto">Contacto</a>
          </nav>
          <div className={styles.col}>
            <h3>Síguenos</h3>
            <a href="https://www.instagram.com/inmobiliariareferencehome/" target="_blank" rel="noopener noreferrer">
              Instagram
            </a>
            <a href="https://www.facebook.com/referencecomprarcasa" target="_blank" rel="noopener noreferrer">
              Facebook
            </a>
            <a href="https://www.youtube.com/channel/UCv7G5UovIrhO8VsCLsGVuFg" target="_blank" rel="noopener noreferrer">
              YouTube
            </a>
          </div>
        </div>

        <div className={styles.legal}>
          <span>© {new Date().getFullYear()} Reference Home · RAICV 00091</span>
          <span>
            <a href="/aviso-legal">Aviso legal</a>
            <a href="/política-privacidad">Privacidad</a>
            <a href="/política-de-cookies">Cookies</a>
          </span>
        </div>
      </footer>
    </>
  );
}
