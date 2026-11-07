"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { sendLead, STATIC_FORMS } from "@/lib/sendLead";
import { requestHeaderToneRefresh } from "@/motion/core/events";
import styles from "./Journey.module.css";

/**
 * El recorrido · un único viaje horizontal tras la noche.
 *
 * Al bajar, la página se queda fija y avanza en horizontal por capítulos
 * encadenados, sin cortes: manifiesto → imagen → errores → casos → método
 * (vídeo) → cinco pasos → equipo → valoración. Con `full={false}` (por
 * defecto) solo se muestran los dos primeros capítulos: manifiesto e imagen. Cada capítulo tiene su
 * bloque de color de la marca y sus capas se mueven a distinta velocidad
 * (data-speed) para dar profundidad; las fotos se revelan al acercarse al
 * centro. Todo el texto está en el HTML (Google lo lee aunque se vea en
 * horizontal). En móvil el recorrido se apila en vertical.
 */

const VIDEO_MARKETING = "https://yjjiwgpycvlmfyhypgun.supabase.co/storage/v1/object/public/web-videos/video_marketing.mp4";
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "1x00000000000000000000AA";

const ERRORS = [
  { n: "01", t: "Precio mal definido", b: "El error más caro al vender. Tu vivienda se queda fuera del mercado." },
  { n: "02", t: "Sin estrategia", b: "Publicar no es vender. Sin un plan, tu vivienda se pierde entre miles de anuncios." },
  { n: "03", t: "Compradores no cualificados", b: "Visitas que no llevan a nada. Solo hacen perder tiempo y desgastan la negociación." },
  { n: "04", t: "Negociación débil", b: "Cada error cuesta dinero. Sin experiencia, puedes perder miles de euros en el cierre." },
];

const CASES = [
  { barrio: "Ruzafa", rooms: "Piso · 3 hab.", price: "315.000 €", days: 14, img: "ruzafa" },
  { barrio: "Benimaclet", rooms: "Piso · 4 hab.", price: "235.000 €", days: 19, img: "benimaclet" },
  { barrio: "Ciutat Vella", rooms: "Piso · 2 hab.", price: "198.000 €", days: 12, img: "ciutat-vella" },
  { barrio: "Cánovas", rooms: "Piso · 3 hab.", price: "385.000 €", days: 26, img: "canovas" },
  { barrio: "Patraix", rooms: "Piso · 3 hab.", price: "205.000 €", days: 35, img: "patraix" },
  { barrio: "Campanar", rooms: "Piso · 4 hab.", price: "365.000 €", days: 22, img: "campanar" },
];

const STEPS = [
  { n: "01", t: "Análisis y valoración", b: "Estudiamos tu vivienda y el mercado para definir el mejor precio de salida.", img: "paso1" },
  { n: "02", t: "Estrategia a medida", b: "Creamos un plan de marketing y comercial específico para tu vivienda.", img: "paso2" },
  { n: "03", t: "Promoción inteligente", b: "Difundimos tu vivienda en los canales que realmente atraen compradores.", img: "paso3" },
  { n: "04", t: "Gestión de visitas", b: "Filtramos a los interesados para que solo visites con quien de verdad puede comprar.", img: "paso4" },
  { n: "05", t: "Negociación y cierre", b: "Negociamos las mejores condiciones y te acompañamos hasta la firma y la posventa.", img: "paso5" },
];

const TEAM = ["Jordi Osca", "Eva García", "Ángeles Albelda", "Sem Fernández", "Felipe Martínez", "Jorge García", "Clara Vázquez"];

// Tono de cada capítulo para la cabecera compartida (claro = texto oscuro).
const DARK_CHAPTERS = new Set(["imagen", "metodo", "equipo", "valoracion", "errores", "pasos"]);

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

type Status = { kind: "idle" | "sending" | "ok" | "error"; message?: string };

function ValuationQuestions() {
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const questions = ["¿Dónde está tu vivienda?", "¿Cómo es?", "¿A quién llamamos?"];

  const next = (e: React.MouseEvent<HTMLButtonElement>) => {
    const fs = e.currentTarget.closest("fieldset");
    const bad = Array.from(fs?.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select") ?? []).find((f) => !f.checkValidity());
    if (bad) {
      bad.reportValidity();
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
    data.set("message", `Solicitud de valoración\nDirección: ${data.get("address")}\nTipo: ${data.get("type")}\nSuperficie: ${data.get("size")} m²`);
    setStatus({ kind: "sending" });
    try {
      await sendLead(data, "home-valoracion-recorrido");
      setStatus({ kind: "ok", message: "Gracias. Un agente de tu zona te llamará para preparar la valoración." });
      form.reset();
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "No se pudo enviar." });
      (window as unknown as { turnstile?: { reset: () => void } }).turnstile?.reset();
    }
  };

  return (
    <form className={styles.vForm} onSubmit={onSubmit} noValidate>
      <input type="text" name="company" tabIndex={-1} autoComplete="off" className={styles.srOnly} aria-hidden="true" />
      <p className={styles.vCount}>
        {String(step + 1).padStart(2, "0")} <span>/ 03</span>
      </p>
      <p className={styles.vQuestion} key={step}>
        {questions[step]}
      </p>
      <div className={styles.vViewport}>
        <div className={styles.vTrack} style={{ transform: `translate3d(${-step * 100}%, 0, 0)` }}>
          <fieldset className={styles.vPanel} disabled={step !== 0} aria-hidden={step !== 0}>
            <legend className={styles.srOnly}>Dirección</legend>
            <label className={styles.vField} htmlFor="j-address">
              <span className={styles.srOnly}>Dirección de la vivienda</span>
              <input id="j-address" name="address" required placeholder="Calle y número, barrio" autoComplete="street-address" />
            </label>
            <button type="button" className={styles.vNext} onClick={next}>
              Siguiente <span aria-hidden="true">→</span>
            </button>
          </fieldset>
          <fieldset className={styles.vPanel} disabled={step !== 1} aria-hidden={step !== 1}>
            <legend className={styles.srOnly}>Tipo y metros</legend>
            <div className={styles.vRow}>
              <label className={styles.vField} htmlFor="j-type">
                <span className={styles.srOnly}>Tipo</span>
                <select id="j-type" name="type" required defaultValue="">
                  <option value="" disabled>
                    Tipo de vivienda
                  </option>
                  <option>Piso</option>
                  <option>Ático</option>
                  <option>Dúplex</option>
                  <option>Bajo</option>
                  <option>Casa o chalet</option>
                </select>
              </label>
              <label className={styles.vField} htmlFor="j-size">
                <span className={styles.srOnly}>Metros cuadrados</span>
                <input id="j-size" name="size" type="number" min={15} max={2000} required inputMode="numeric" placeholder="m²" />
              </label>
            </div>
            <div className={styles.vActions}>
              <button type="button" className={styles.vBack} onClick={() => setStep(0)}>
                Atrás
              </button>
              <button type="button" className={styles.vNext} onClick={next}>
                Siguiente <span aria-hidden="true">→</span>
              </button>
            </div>
          </fieldset>
          <fieldset className={styles.vPanel} disabled={step !== 2} aria-hidden={step !== 2}>
            <legend className={styles.srOnly}>Tus datos</legend>
            <div className={styles.vRow}>
              <label className={styles.vField} htmlFor="j-name">
                <span className={styles.srOnly}>Nombre</span>
                <input id="j-name" name="name" required autoComplete="name" placeholder="Nombre" />
              </label>
              <label className={styles.vField} htmlFor="j-phone">
                <span className={styles.srOnly}>Teléfono</span>
                <input id="j-phone" name="phone" type="tel" required autoComplete="tel" inputMode="tel" placeholder="Teléfono" />
              </label>
            </div>
            <label className={styles.vCheck} htmlFor="j-privacy">
              <input id="j-privacy" name="privacy" type="checkbox" required />
              <span>
                Acepto la <a href="/política-privacidad">política de privacidad</a>
              </span>
            </label>
            {!STATIC_FORMS && <div className="cf-turnstile" data-sitekey={TURNSTILE_SITE_KEY} data-size="flexible" data-theme="dark" />}
            <div className={styles.vActions}>
              <button type="button" className={styles.vBack} onClick={() => setStep(1)}>
                Atrás
              </button>
              <button type="submit" className={styles.vNext} disabled={status.kind === "sending"}>
                {status.kind === "sending" ? "Enviando…" : "Pedir mi valoración"}
              </button>
            </div>
          </fieldset>
        </div>
      </div>
      <p className={styles.vStatus} role="status" data-kind={status.kind}>
        {status.message}
      </p>
    </form>
  );
}

export function Journey({ full = false }: { full?: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobileQ = window.matchMedia("(max-width: 900px)");
    const layers = Array.from(track.querySelectorAll<HTMLElement>("[data-speed]"));
    const reveals = Array.from(track.querySelectorAll<HTMLElement>("[data-reveal]"));
    const chapters = Array.from(track.querySelectorAll<HTMLElement>("[data-chapter]"));
    const video = track.querySelector("video");
    let distance = 0;
    let raf = 0;
    let lastChapter = "";

    const measure = () => {
      if (mobileQ.matches) {
        section.style.height = "";
        track.style.transform = "";
        distance = 0;
        return;
      }
      distance = Math.max(0, track.scrollWidth - window.innerWidth);
      section.style.height = `${distance + window.innerHeight}px`;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    window.addEventListener("resize", measure);

    const io = new IntersectionObserver(
      (e) => {
        if (!video) return;
        if (e[0]?.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { rootMargin: "300px" },
    );
    io.observe(section);

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const r = section.getBoundingClientRect();
      if (r.bottom < -200 || r.top > window.innerHeight + 200) return;
      const vw = window.innerWidth;
      const mobile = mobileQ.matches;
      let p = 0;
      if (!mobile) {
        p = clamp01(-r.top / Math.max(1, distance));
        track.style.transform = `translate3d(${(-p * distance).toFixed(1)}px, 0, 0)`;
        if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
      }
      if (!reduced && !mobile) {
        for (const el of layers) {
          const b = el.getBoundingClientRect();
          const off = (b.left + b.width / 2 - vw / 2) / vw;
          el.style.transform = `translate3d(${(off * Number(el.dataset.speed) * 100).toFixed(2)}px, 0, 0)`;
        }
      }
      const vh = window.innerHeight;
      for (const el of reveals) {
        const b = el.getBoundingClientRect();
        const t = mobile ? clamp01((vh - b.top) / (vh * 0.6)) : clamp01((vw - b.left) / (vw * 0.55));
        el.style.setProperty("--r", (reduced ? 1 : t).toFixed(3));
      }
      // Capítulo activo: el que ocupa el centro de la pantalla.
      let current = "";
      for (const c of chapters) {
        const b = c.getBoundingClientRect();
        if (mobile ? b.top <= 60 && b.bottom > 60 : b.left <= vw * 0.5 && b.right > vw * 0.5) current = c.dataset.chapter ?? "";
      }
      if (current && current !== lastChapter) {
        lastChapter = current;
        if (labelRef.current) labelRef.current.textContent = chapters.find((c) => c.dataset.chapter === current)?.dataset.label ?? "";
        if (DARK_CHAPTERS.has(current)) section.setAttribute("data-header-tone", "dark");
        else section.removeAttribute("data-header-tone");
        requestHeaderToneRefresh();
      }
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <section ref={sectionRef} className={styles.journey} aria-label="Cómo vendemos tu vivienda" data-header-transparent="true">
      {!STATIC_FORMS && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="lazyOnload" />}
      <div className={styles.sticky}>
        <div ref={trackRef} className={styles.track}>
          {/* 1 · Manifiesto */}
          <article className={`${styles.ch} ${styles.manifesto}`} data-chapter="manifiesto" data-label="Manifiesto">
            <p className={styles.kicker}>Por qué una vivienda no se vende</p>
            <h2 className={styles.giant}>
              <span data-speed="-0.6">No es</span>
              <span data-speed="0.4">el mercado.</span>
              <span data-speed="-0.25" className={styles.wine}>
                <em>Es cómo se vende.</em>
              </span>
            </h2>
            <p className={styles.side} data-speed="0.8">
              Una vivienda puede tener ubicación, calidad y demanda. Pero si el precio, la estrategia, el comprador o la negociación fallan, el mercado
              deja de responder.
            </p>
          </article>

          {/* 2 · La imagen vende: collage con profundidad */}
          <article className={`${styles.ch} ${styles.collage}`} data-chapter="imagen" data-label="La imagen">
            <span className={styles.vertical}>Imagen</span>
            <figure className={`${styles.ph} ${styles.c1}`} data-speed="-0.9" data-reveal="">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/nueva/casos/ruzafa.webp" alt="Salón luminoso de una vivienda en Ruzafa" loading="lazy" />
            </figure>
            <figure className={`${styles.ph} ${styles.c2}`} data-speed="0.6" data-reveal="">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/nueva/viaje/camara.webp" alt="Cámara para el reportaje fotográfico de la vivienda" loading="lazy" />
            </figure>
            <figure className={`${styles.ph} ${styles.c3}`} data-speed="-0.3" data-reveal="">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/nueva/viaje/comprar.webp" alt="Salón amplio con ventanales" loading="lazy" />
            </figure>
            <figure className={`${styles.ph} ${styles.c4}`} data-speed="1.1" data-reveal="">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/nueva/casos/canovas.webp" alt="Salón señorial en Cánovas" loading="lazy" />
            </figure>
            <div className={styles.collageText} data-speed="0.3">
              <h2>
                Una casa se compra <em>con los ojos.</em>
              </h2>
              <p>Fotografía y vídeo profesionales, y un plan para que tu vivienda llegue al comprador adecuado.</p>
            </div>
          </article>

          {full && (
            <>
          {/* 3 · Errores */}
          <article className={`${styles.ch} ${styles.errors}`} data-chapter="errores" data-label="Los errores">
            <h2 className={styles.chTitle} data-speed="-0.3">
              Cuatro errores <em>que cuestan dinero.</em>
            </h2>
            <ol className={styles.errList}>
              {ERRORS.map((e, i) => (
                <li key={e.n} data-speed={String(0.3 + i * 0.25)}>
                  <span className={styles.outline}>{e.n}</span>
                  <h3>{e.t}</h3>
                  <p>{e.b}</p>
                </li>
              ))}
            </ol>
          </article>

          {/* 4 · Casos reales */}
          <article className={`${styles.ch} ${styles.cases}`} data-chapter="casos" data-label="Casos reales" id="casos">
            <h2 className={styles.chTitle} data-speed="-0.4">
              Resultados <em>reales.</em>
            </h2>
            <ul className={styles.caseList}>
              {CASES.map((c, i) => (
                <li key={c.barrio} className={i % 2 ? styles.low : undefined}>
                  <figure className={styles.casePh} data-reveal="">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/nueva/casos/${c.img}.webp`} alt={`Imagen orientativa del caso de ${c.barrio}`} loading="lazy" />
                    <figcaption>Imagen orientativa</figcaption>
                  </figure>
                  <h3>{c.barrio}</h3>
                  <p>
                    <b>{c.price}</b> · {c.rooms}
                  </p>
                  <p className={styles.days}>Vendido en {c.days} días</p>
                </li>
              ))}
            </ul>
          </article>

          {/* 5 · Método: el vídeo a toda la altura */}
          <article className={`${styles.ch} ${styles.method}`} data-chapter="metodo" data-label="El método">
            <video className={styles.methodVideo} src={VIDEO_MARKETING} muted loop playsInline preload="metadata" />
            <div className={styles.methodText} data-speed="0.5">
              <h2>
                Cada vivienda necesita <em>una estrategia propia.</em>
              </h2>
              <p>Valoramos. Posicionamos. Defendemos.</p>
            </div>
          </article>

          {/* 6 · Cinco pasos */}
          <article className={`${styles.ch} ${styles.steps}`} data-chapter="pasos" data-label="Cada paso">
            <h2 className={styles.chTitle} data-speed="-0.3">
              Cada paso <em>importa.</em>
            </h2>
            <ol className={styles.stepList}>
              {STEPS.map((s) => (
                <li key={s.n}>
                  <span className={styles.bigNum} data-speed="-0.7">
                    {s.n}
                  </span>
                  <figure className={styles.stepPh} data-reveal="">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/nueva/viaje/${s.img}.webp`} alt={s.t} loading="lazy" />
                  </figure>
                  <h3>{s.t}</h3>
                  <p>{s.b}</p>
                </li>
              ))}
            </ol>
          </article>

          {/* 7 · Equipo */}
          <article className={`${styles.ch} ${styles.team}`} data-chapter="equipo" data-label="El equipo" id="equipo">
            <figure className={styles.teamPh} data-reveal="">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/nueva/equipo/equipo-real.webp" alt="El equipo de Reference Home en la oficina" loading="lazy" />
            </figure>
            <div className={styles.teamText} data-speed="0.4">
              <h2>
                Siete personas. <em>Una forma de hacer.</em>
              </h2>
              <ul>
                {TEAM.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
              <p className={styles.teamLinks}>
                <a href="tel:+34963547596">963 547 596</a>
                <a href="https://wa.me/34674612272" target="_blank" rel="noopener noreferrer">
                  WhatsApp
                </a>
              </p>
            </div>
          </article>

          {/* 8 · Valoración */}
          <article className={`${styles.ch} ${styles.valuation}`} data-chapter="valoracion" data-label="Tu valoración" id="valoracion">
            <div className={styles.vHead} data-speed="-0.4">
              <p className={styles.kicker}>Valoración gratuita</p>
              <h2>
                ¿Cuánto vale <em>tu casa?</em>
              </h2>
            </div>
            <ValuationQuestions />
          </article>
            </>
          )}
        </div>

        <div className={styles.progress} aria-hidden="true">
          <span ref={labelRef}>Manifiesto</span>
          <i>
            <span ref={barRef} />
          </i>
        </div>
      </div>
    </section>
  );
}
