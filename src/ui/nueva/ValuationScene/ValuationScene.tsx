"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import styles from "./ValuationScene.module.css";

/**
 * Valoración · «La casa se ilumina».
 *
 * A la derecha, la casa de la portada dentro de un arco mediterráneo: crece
 * al bajar y sus luces se encienden (atardecer → noche). A la izquierda, la
 * pregunta y un formulario en tres pasos (dirección → tipo y metros →
 * contacto) que envía a /api/contact, con la misma verificación anti-robots
 * (Turnstile) que el formulario de contacto.
 *
 * `ValuationVisual` es el arco + titular sin formulario: lo usa también la
 * sección de inmuebles, que lo revela detrás de su vídeo, para que el relevo
 * con esta escena sea continuo.
 */

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "1x00000000000000000000AA";

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
function ease(t: number) {
  const c = clamp01(t);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

export function ValuationVisual({ withForm = false }: { withForm?: boolean }) {
  return (
    <>
      <div className={styles.arch} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.dusk} src="/nueva/atardecer.webp" alt="" loading="lazy" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.night} src="/nueva/noche.webp" alt="" loading="lazy" />
      </div>
      <div className={styles.copy}>
        <p className={styles.eyebrow}>Valoración gratuita</p>
        {withForm ? (
          <h2 id="valuation-title" className={styles.title}>
            ¿Cuánto vale <em>tu casa?</em>
          </h2>
        ) : (
          <p className={styles.title}>
            ¿Cuánto vale <em>tu casa?</em>
          </p>
        )}
        <p className={styles.lead}>
          Un agente que conoce tu barrio estudia tu vivienda y te da un precio realista, con ventas reales de la zona. Sin compromiso.
        </p>
      </div>
    </>
  );
}

/** Primer fotograma de la escena (sin formulario), para revelarlo detrás del vídeo de inmuebles. */
export function ValuationIntro() {
  return (
    <div className={styles.stage} style={{ position: "relative", height: "100%" }} aria-hidden="true">
      <ValuationVisual />
    </div>
  );
}

type Status = { kind: "idle" | "sending" | "ok" | "error"; message?: string };

export function ValuationScene() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const r = section.getBoundingClientRect();
      if (r.bottom < -100 || r.top > window.innerHeight + 100) return;
      const p = reduced ? 1 : clamp01(-r.top / Math.max(1, r.height - window.innerHeight));
      stage.style.setProperty("--grow", String(ease(p / 0.55)));
      stage.style.setProperty("--lights", String(ease((p - 0.2) / 0.5)));
      stage.style.setProperty("--form", String(ease(p / 0.18)));
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const next = (e: React.MouseEvent<HTMLButtonElement>) => {
    const fieldset = e.currentTarget.closest("fieldset");
    const fields = Array.from(fieldset?.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select") ?? []);
    const invalid = fields.find((f) => !f.checkValidity());
    if (invalid) {
      invalid.reportValidity();
      return;
    }
    setStep((s) => Math.min(2, s + 1));
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const data = new FormData(form);
    // La ruta de contacto espera un mensaje: se resume aquí la valoración.
    data.set(
      "message",
      `Solicitud de valoración\nDirección: ${data.get("address")}\nTipo: ${data.get("type")}\nSuperficie: ${data.get("size")} m²`,
    );
    setStatus({ kind: "sending" });
    try {
      const res = await fetch("/api/contact", { method: "POST", body: data, headers: { Accept: "application/json" } });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.message || "No se pudo enviar.");
      setStatus({ kind: "ok", message: "Gracias. Un agente de tu zona te llamará para preparar la valoración." });
      form.reset();
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "No se pudo enviar. Inténtalo de nuevo." });
      (window as unknown as { turnstile?: { reset: () => void } }).turnstile?.reset();
    }
  };

  return (
    <section ref={sectionRef} className={styles.scene} id="valoracion" aria-labelledby="valuation-title">
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="lazyOnload" />
      <div ref={stageRef} className={styles.stage}>
        <ValuationVisual withForm />

        <form className={styles.form} onSubmit={onSubmit} noValidate>
          <input type="text" name="company" tabIndex={-1} autoComplete="off" className={styles.honey} aria-hidden="true" />
          <ol className={styles.steps} aria-label="Pasos">
            {["Vivienda", "Detalles", "Contacto"].map((label, i) => (
              <li key={label} data-on={i <= step ? "" : undefined}>
                <span>{i + 1}</span> {label}
              </li>
            ))}
          </ol>
          <div className={styles.track} style={{ transform: `translate3d(${-step * 100}%, 0, 0)` }}>
            <fieldset className={styles.panel} disabled={step !== 0} aria-hidden={step !== 0}>
              <legend className={styles.srOnly}>Dirección de la vivienda</legend>
              <label className={styles.field} htmlFor="val-address">
                <span>Dirección de la vivienda</span>
                <input id="val-address" name="address" required placeholder="Calle y número, barrio" autoComplete="street-address" />
              </label>
              <button type="button" className={styles.next} onClick={next}>
                Siguiente <span aria-hidden="true">→</span>
              </button>
            </fieldset>

            <fieldset className={styles.panel} disabled={step !== 1} aria-hidden={step !== 1}>
              <legend className={styles.srOnly}>Tipo y superficie</legend>
              <div className={styles.row}>
                <label className={styles.field} htmlFor="val-type">
                  <span>Tipo</span>
                  <select id="val-type" name="type" required defaultValue="">
                    <option value="" disabled>
                      Elige
                    </option>
                    <option>Piso</option>
                    <option>Ático</option>
                    <option>Dúplex</option>
                    <option>Bajo</option>
                    <option>Casa o chalet</option>
                  </select>
                </label>
                <label className={styles.field} htmlFor="val-size">
                  <span>Metros cuadrados</span>
                  <input id="val-size" name="size" type="number" min={15} max={2000} required inputMode="numeric" placeholder="90" />
                </label>
              </div>
              <div className={styles.actions}>
                <button type="button" className={styles.back} onClick={() => setStep(0)}>
                  Atrás
                </button>
                <button type="button" className={styles.next} onClick={next}>
                  Siguiente <span aria-hidden="true">→</span>
                </button>
              </div>
            </fieldset>

            <fieldset className={styles.panel} disabled={step !== 2} aria-hidden={step !== 2}>
              <legend className={styles.srOnly}>Tus datos</legend>
              <div className={styles.row}>
                <label className={styles.field} htmlFor="val-name">
                  <span>Nombre</span>
                  <input id="val-name" name="name" required autoComplete="name" />
                </label>
                <label className={styles.field} htmlFor="val-phone">
                  <span>Teléfono</span>
                  <input id="val-phone" name="phone" type="tel" required autoComplete="tel" inputMode="tel" />
                </label>
              </div>
              <label className={styles.check} htmlFor="val-privacy">
                <input id="val-privacy" name="privacy" type="checkbox" required />
                <span>
                  Acepto la <a href="/política-privacidad">política de privacidad</a>
                </span>
              </label>
              <div className="cf-turnstile" data-sitekey={TURNSTILE_SITE_KEY} data-size="flexible" data-theme="light" />
              <div className={styles.actions}>
                <button type="button" className={styles.back} onClick={() => setStep(1)}>
                  Atrás
                </button>
                <button type="submit" className={styles.submit} disabled={status.kind === "sending"}>
                  {status.kind === "sending" ? "Enviando…" : "Pedir mi valoración"}
                </button>
              </div>
            </fieldset>
          </div>
          <p className={styles.status} role="status" data-kind={status.kind}>
            {status.message}
          </p>
        </form>
      </div>
    </section>
  );
}
