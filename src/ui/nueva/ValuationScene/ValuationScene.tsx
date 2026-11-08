"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Script from "next/script";
import { sendLead, STATIC_FORMS } from "@/lib/sendLead";
import { HEADER_TONE_REFRESH_EVENT } from "@/motion/core/events";
import { subscribeFrame } from "@/motion/core/frameTicker";
import styles from "./ValuationScene.module.css";

/**
 * Valoración · «Cruza la puerta».
 *
 * 1. Umbral: una puerta real (foto) en una pared crema. Al bajar, sus dos
 *    hojas se abren y la cámara cruza el umbral hasta el comedor.
 * 2. Dentro, a pantalla completa, una pregunta cada vez; cada respuesta
 *    cambia la escena:
 *    - «¿Dónde está?» → el comedor; tras responder, el salón con vistas y,
 *      si la dirección menciona un barrio con caso real, su dato real.
 *    - «¿A quién llamamos?» → la terraza al atardecer.
 *    - Enviado → «Gracias, ya estamos en ello».
 * Envía a /api/contact con Turnstile, como el formulario de contacto.
 */

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "1x00000000000000000000AA";

// Datos reales de casos de la web actual.
const BARRIOS: Record<string, { name: string; days: number }> = {
  ruzafa: { name: "Ruzafa", days: 14 },
  russafa: { name: "Ruzafa", days: 14 },
  benimaclet: { name: "Benimaclet", days: 19 },
  "ciutat vella": { name: "Ciutat Vella", days: 12 },
  "ciudad vieja": { name: "Ciutat Vella", days: 12 },
  canovas: { name: "Cánovas", days: 26 },
  cánovas: { name: "Cánovas", days: 26 },
  patraix: { name: "Patraix", days: 35 },
  campanar: { name: "Campanar", days: 22 },
};

// Fotos que no se usan en ninguna otra parte de la home.
const SCENES = ["/nueva/viaje/comedor-puerta.webp", "/nueva/viaje/salon-mar.webp", "/nueva/viaje/terraza.webp"];
const TYPES = ["Piso", "Ático", "Dúplex", "Bajo", "Casa o chalet"];

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
function ease(t: number) {
  const c = clamp01(t);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}
function findBarrio(address: string) {
  const a = address.toLowerCase();
  const key = Object.keys(BARRIOS).find((k) => a.includes(k));
  return key ? BARRIOS[key] : null;
}

type Status = { kind: "idle" | "sending" | "ok" | "error"; message?: string };

/**
 * La puerta real: foto de la pared con el hueco recortado, y las dos hojas
 * recortadas de la misma foto, que giran en 3D sobre sus bisagras. Todo va
 * dentro de una caja con la proporción de la foto, así las hojas encajan al
 * píxel en el hueco a cualquier tamaño de pantalla. Detrás, el comedor.
 */
function Door() {
  return (
    <div className={styles.wall} aria-hidden="true">
      <div className={styles.doorBox}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={`${styles.leaf} ${styles.leafL}`} src="/nueva/viaje/puerta-hoja-izq.webp" alt="" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={`${styles.leaf} ${styles.leafR}`} src="/nueva/viaje/puerta-hoja-der.webp" alt="" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.wallImg} src="/nueva/viaje/puerta-pared.webp" alt="" />
        <p className={`${styles.flank} ${styles.flankL}`}>¿Cuánto vale</p>
        <p className={`${styles.flank} ${styles.flankR}`}>
          <em>tu casa?</em>
        </p>
      </div>
    </div>
  );
}

/** Primer fotograma (la puerta cerrada), para revelarlo detrás del vídeo de inmuebles. */
export function ValuationIntro() {
  return (
    <div className={styles.stage} style={{ position: "relative", height: "100%", visibility: "visible" }} aria-hidden="true">
      <div className={styles.scenes}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.scene} data-on="" src={SCENES[0]} alt="" />
      </div>
      <Door />
    </div>
  );
}

export function ValuationScene() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [type, setType] = useState("");
  const [barrio, setBarrio] = useState<{ name: string; days: number } | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const done = status.kind === "ok";
  const scene = done || step >= 2 ? 2 : step;

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(max-width: 760px)");
    // Sección siguiente («¿Cómo podemos ayudarte?»): entra en horizontal
    // durante la última pantalla, empujando a esta hacia la izquierda.
    const nextEl = section.nextElementSibling instanceof HTMLElement && section.nextElementSibling.hasAttribute("data-hslide-next")
      ? section.nextElementSibling
      : null;
    let measuring = false;
    const onRefreshInit = () => {
      measuring = true;
      if (nextEl) nextEl.style.transform = "none";
    };
    const onRefresh = () => {
      measuring = false;
    };
    ScrollTrigger.addEventListener("refreshInit", onRefreshInit);
    ScrollTrigger.addEventListener("refresh", onRefresh);
    // Va en el mismo fotograma que el scroll suave (después de lenis.raf):
    // así la sección siguiente no va un fotograma por detrás y no da tirones.
    const loop = () => {
      const r = section.getBoundingClientRect();
      const vh = window.innerHeight;
      const flat = reduced || mobile.matches;
      const show = mobile.matches || r.top <= 1;
      if (stage.style.visibility !== (show ? "visible" : "hidden")) stage.style.visibility = show ? "visible" : "hidden";
      if (nextEl && !measuring) {
        const top = r.bottom - vh;
        nextEl.style.transform = flat || top <= 0 ? "none" : top >= vh ? "" : `translate3d(${((top / vh) * 100).toFixed(3)}%, ${(-top).toFixed(1)}px, 0)`;
      }
      if (r.bottom < -100 || r.top > vh + 100) return;
      const run = Math.max(1, r.height - 2 * vh);
      const p = flat ? 1 : clamp01(-r.top / run);
      const tail = flat ? 0 : clamp01((-r.top - run) / vh);
      stage.style.transform = tail > 0 ? `translate3d(${(-tail * 100).toFixed(3)}%, 0, 0)` : "";
      // 0–45 %: cruzar el arco. Después, ya dentro.
      const cross = ease(p / 0.45);
      stage.style.setProperty("--cross", cross.toFixed(4));
      stage.toggleAttribute("data-inside", cross > 0.92);
      // Delante de la pared crema el menú va oscuro; al abrirse la puerta,
      // vuelve a blanco sobre el comedor.
      const tone = !flat && r.top <= 1 && cross < 0.3 ? "light" : "dark";
      if (section.dataset.headerTone !== tone) {
        section.dataset.headerTone = tone;
        window.dispatchEvent(new Event(HEADER_TONE_REFRESH_EVENT));
      }
    };
    const unsubscribe = subscribeFrame(loop);
    window.addEventListener("scroll", loop, { passive: true });
    loop();
    return () => {
      unsubscribe();
      window.removeEventListener("scroll", loop);
      ScrollTrigger.removeEventListener("refreshInit", onRefreshInit);
      ScrollTrigger.removeEventListener("refresh", onRefresh);
    };
  }, []);

  const next = (e: React.MouseEvent<HTMLButtonElement>) => {
    const fs = e.currentTarget.closest("fieldset");
    const fields = Array.from(fs?.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select") ?? []);
    const bad = fields.find((f) => !f.checkValidity());
    if (bad) {
      bad.reportValidity();
      return;
    }
    if (step === 0) {
      const addr = (fs?.querySelector<HTMLInputElement>("input[name=address]")?.value ?? "").trim();
      setBarrio(findBarrio(addr));
      goToValuator(addr);
      return;
    }
    setStep((s) => Math.min(3, s + 1));
  };

  // La dirección pasa al valorador propio (/valorar/), que la localiza y
  // sigue desde ahí: el visitante no la escribe dos veces y el contacto
  // entra en el CRM con su valoración.
  const goToValuator = (addr: string) => {
    window.location.href = `/valorar/?direccion=${encodeURIComponent(addr.slice(0, 160))}`;
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (step === 0) {
      const input = form.querySelector<HTMLInputElement>("input[name=address]");
      if (!input?.value.trim()) {
        input?.reportValidity();
        return;
      }
      goToValuator(input.value.trim());
      return;
    }
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const data = new FormData(form);
    data.set("message", `Solicitud de valoración\nDirección: ${data.get("address")}\nTipo: ${data.get("type")}\nSuperficie: ${data.get("size")} m²`);
    setStatus({ kind: "sending" });
    try {
      await sendLead(data, "home-valoracion");
      setStatus({ kind: "ok" });
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "No se pudo enviar. Inténtalo de nuevo." });
      (window as unknown as { turnstile?: { reset: () => void } }).turnstile?.reset();
    }
  };

  // Lo que dice la escena en cada paso.
  const caption =
    step === 1
      ? barrio
        ? `En ${barrio.name} hemos vendido en ${barrio.days} días.`
        : "Conocemos cada barrio de Valencia, calle a calle."
      : step === 2
        ? "Un agente de propietarios te llamará para preparar tu valoración."
        : "";

  const questions = ["¿Dónde está tu casa?", "¿Cómo es?", "¿A quién llamamos?"];

  return (
    <section ref={sectionRef} className={styles.section} id="valoracion" aria-labelledby="valuation-title" data-header-tone="dark" data-header-transparent="true">
      {!STATIC_FORMS && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="lazyOnload" />}
      <div ref={stageRef} className={styles.stage}>
        {/* Escenas que cambian con cada respuesta */}
        <div className={styles.scenes} aria-hidden="true">
          {SCENES.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} className={styles.scene} data-on={i === scene ? "" : undefined} src={src} alt="" />
          ))}
          <div className={styles.shade} data-done={done ? "" : undefined} />
        </div>

        {/* La puerta, que se abre y se cruza al bajar */}
        <Door />

        {/* Dentro: una pregunta cada vez */}
        <div className={styles.inside}>
          <h2 id="valuation-title" className={styles.srOnly}>
            Valoración gratuita de tu vivienda en Valencia
          </h2>

          {done ? (
            <div className={styles.thanks}>
              <p className={styles.kicker}>Solicitud recibida</p>
              <p className={styles.question}>
                Gracias. <em>Ya estamos en ello.</em>
              </p>
              <p className={styles.caption}>Un agente de tu zona te llamará para preparar la valoración.</p>
            </div>
          ) : (
            <form className={styles.form} onSubmit={onSubmit} noValidate>
              <input type="text" name="company" tabIndex={-1} autoComplete="off" className={styles.srOnly} aria-hidden="true" />
              <p className={styles.kicker}>
                Valoración gratuita · en dos minutos
              </p>
              <p className={styles.question} key={`q${step}`}>
                {questions[step]}
              </p>

              <div className={styles.viewport}>
                <div className={styles.track} style={{ transform: `translate3d(${-step * 100}%, 0, 0)` }}>
                  <fieldset className={styles.panel} disabled={step !== 0} aria-hidden={step !== 0}>
                    <legend className={styles.srOnly}>Dirección de la vivienda</legend>
                    <label className={styles.line} htmlFor="val-address">
                      <span className={styles.srOnly}>Dirección de la vivienda</span>
                      <input id="val-address" name="address" required placeholder="Calle, número y barrio" autoComplete="street-address" />
                      <button type="button" className={styles.go} onClick={next} aria-label="Siguiente">
                        →
                      </button>
                    </label>
                  </fieldset>

                  <fieldset className={styles.panel} disabled={step !== 1} aria-hidden={step !== 1}>
                    <legend className={styles.srOnly}>Tipo y superficie</legend>
                    <div className={styles.chips} role="radiogroup" aria-label="Tipo de vivienda">
                      {TYPES.map((t) => (
                        <label key={t} className={styles.chip} data-on={type === t ? "" : undefined}>
                          <input type="radio" name="type" value={t} required checked={type === t} onChange={() => setType(t)} />
                          {t}
                        </label>
                      ))}
                    </div>
                    <label className={styles.line} htmlFor="val-size">
                      <span className={styles.srOnly}>Metros cuadrados</span>
                      <input id="val-size" name="size" type="number" min={15} max={2000} required inputMode="numeric" placeholder="Metros cuadrados" />
                      <button type="button" className={styles.go} onClick={next} aria-label="Siguiente">
                        →
                      </button>
                    </label>
                    <button type="button" className={styles.back} onClick={() => setStep(0)}>
                      ← Cambiar dirección
                    </button>
                  </fieldset>

                  <fieldset className={styles.panel} disabled={step !== 2} aria-hidden={step !== 2}>
                    <legend className={styles.srOnly}>Tus datos</legend>
                    <div className={styles.pair}>
                      <label className={styles.line} htmlFor="val-name">
                        <span className={styles.srOnly}>Nombre</span>
                        <input id="val-name" name="name" required autoComplete="name" placeholder="Tu nombre" />
                      </label>
                      <label className={styles.line} htmlFor="val-phone">
                        <span className={styles.srOnly}>Teléfono</span>
                        <input id="val-phone" name="phone" type="tel" required autoComplete="tel" inputMode="tel" placeholder="Teléfono" />
                      </label>
                    </div>
                    <label className={styles.check} htmlFor="val-privacy">
                      <input id="val-privacy" name="privacy" type="checkbox" required />
                      <span>
                        Acepto la <a href="/política-privacidad">política de privacidad</a>
                      </span>
                    </label>
                    {!STATIC_FORMS && <div className="cf-turnstile" data-sitekey={TURNSTILE_SITE_KEY} data-size="flexible" data-theme="dark" />}
                    <div className={styles.actions}>
                      <button type="submit" className={styles.submit} disabled={status.kind === "sending"}>
                        {status.kind === "sending" ? "Enviando…" : "Pedir mi valoración"}
                      </button>
                      <button type="button" className={styles.back} onClick={() => setStep(1)}>
                        ← Atrás
                      </button>
                    </div>
                  </fieldset>
                </div>
              </div>

              <p className={styles.caption} key={`c${step}${barrio?.name ?? ""}`} aria-live="polite">
                {caption}
              </p>
              {status.kind === "error" && (
                <p className={styles.error} role="alert">
                  {status.message}
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
