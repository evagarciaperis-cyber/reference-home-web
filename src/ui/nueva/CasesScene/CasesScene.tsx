"use client";

import { useEffect, useRef } from "react";
import styles from "./CasesScene.module.css";

/**
 * Escena 4 · Casos reales.
 *
 * Vuelo tipográfico en profundidad: cada vivienda vendida (datos reales de
 * la web actual) llega desde el fondo, se queda nítida un momento y pasa de
 * largo por delante de la cámara, con su foto encima y los datos debajo.
 * Mientras tanto el fondo pasa de la noche a las primeras luces del amanecer.
 */

// Fotos: las mismas que acompañan a cada caso en la web actual. Son
// imágenes orientativas (la mayoría generadas), no fotos de la vivienda
// vendida, y así se indica en cada tarjeta. Si llega la foto real de un
// caso, se sustituye y se pone `real: true` para quitar la etiqueta.
const CASES = [
  { barrio: "Ruzafa", rooms: "Piso · 3 habitaciones", price: "315.000 €", days: 14, img: "ruzafa", real: false },
  { barrio: "Benimaclet", rooms: "Piso · 4 habitaciones", price: "235.000 €", days: 19, img: "benimaclet", real: false },
  { barrio: "Ciutat Vella", rooms: "Piso · 2 habitaciones", price: "198.000 €", days: 12, img: "ciutat-vella", real: false },
  { barrio: "Cánovas", rooms: "Piso · 3 habitaciones", price: "385.000 €", days: 26, img: "canovas", real: false },
  { barrio: "Patraix", rooms: "Piso · 3 habitaciones", price: "205.000 €", days: 35, img: "patraix", real: false },
  { barrio: "Campanar", rooms: "Piso · 4 habitaciones", price: "365.000 €", days: 22, img: "campanar", real: false },
] as const;

const AVG_DAYS = Math.round(CASES.reduce((s, c) => s + c.days, 0) / CASES.length);
const TITLE = "Resultados reales.";

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
function smooth(t: number) {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
}

export function CasesScene() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLOListElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const desktop = window.matchMedia("(min-width: 761px)").matches;
    const cards = Array.from(cardsRef.current?.querySelectorAll<HTMLElement>("li") ?? []);
    const words = Array.from(titleRef.current?.querySelectorAll<HTMLElement>("[data-w]") ?? []);
    const n = cards.length;
    let raf = 0;
    let lastIdx = -1;

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const r = section.getBoundingClientRect();
      if (r.bottom < -100 || r.top > window.innerHeight + 100) return;
      const p = clamp01(-r.top / Math.max(1, r.height - window.innerHeight));

      // Noche → primeras luces del amanecer.
      stage.style.setProperty("--dawn", String(smooth((p - 0.15) / 0.85)));

      words.forEach((el, i) => el.style.setProperty("--f", String(smooth((p / 0.12) * words.length - i))));

      // Vuelo: cada tarjeta ocupa un tramo; t = -1 lejos, 0 delante, +1 ya pasó.
      const flight = clamp01(p / 0.86) * (n - 0.001);
      cards.forEach((el, i) => {
        const t = Math.max(-1.2, Math.min(1.2, flight - i - 0.32));
        const scale = reduced ? 1 : t < 0 ? 1 + t * 0.7 : 1 + t * t * 1.4 + t * 0.3;
        const opacity = t < 0 ? smooth((t + 0.5) / 0.38) : 1 - smooth((t - 0.12) / 0.3);
        const blur = reduced || !desktop ? 0 : Math.abs(t) > 0.25 ? (Math.abs(t) - 0.25) * 10 : 0;
        el.style.opacity = opacity.toFixed(3);
        el.style.transform = `translate3d(-50%, calc(-50% + ${(t * -4).toFixed(2)}vh), 0) scale(${scale.toFixed(3)})`;
        el.style.filter = blur > 0.1 ? `blur(${blur.toFixed(1)}px)` : "none";
        el.style.visibility = opacity < 0.01 ? "hidden" : "visible";
      });
      const idx = Math.min(n - 1, Math.floor(flight));
      if (idx !== lastIdx) {
        lastIdx = idx;
        if (countRef.current) countRef.current.textContent = `${String(idx + 1).padStart(2, "0")} / ${String(n).padStart(2, "0")}`;
      }
      if (barRef.current) barRef.current.style.transform = `scaleX(${clamp01(p / 0.86)})`;
      if (endRef.current) {
        const e = smooth((p - 0.88) / 0.08);
        endRef.current.style.opacity = String(e);
        endRef.current.style.transform = `translate3d(-50%, calc(-50% + ${(1 - e) * 24}px), 0)`;
        endRef.current.style.visibility = e < 0.01 ? "hidden" : "visible";
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <section ref={sectionRef} className={styles.scene} id="casos" aria-labelledby="cases-title">
      <div ref={stageRef} className={styles.stage}>
        <div className={styles.head}>
          <p className={styles.eyebrow}>Casos reales</p>
          <h2 ref={titleRef} id="cases-title" className={styles.title}>
            {TITLE.split(" ").map((w, i) => (
              <span key={i} data-w="">
                {w}{" "}
              </span>
            ))}
          </h2>
        </div>

        <ol ref={cardsRef} className={styles.cards}>
          {CASES.map((c, i) => (
            <li key={c.barrio} className={styles.card}>
              <figure className={styles.photo}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/nueva/casos/${c.img}.webp`} alt={`Vivienda de referencia para el caso de ${c.barrio}`} loading="lazy" />
                {!c.real && <figcaption>Imagen orientativa</figcaption>}
              </figure>
              <span className={styles.index}>{String(i + 1).padStart(2, "0")}</span>
              <h3 className={styles.barrio}>{c.barrio}</h3>
              <p className={styles.price}>{c.price}</p>
              <p className={styles.meta}>
                <span>{c.rooms}</span>
                <span className={styles.days}>
                  Vendido en <strong>{c.days}</strong> días
                </span>
              </p>
            </li>
          ))}
        </ol>

        <div ref={endRef} className={styles.end}>
          <p className={styles.endBig}>
            <strong>{AVG_DAYS}</strong> días
          </p>
          <p className={styles.endText}>de media en vender estas seis viviendas.</p>
          <a className={styles.endLink} href="#casos">
            Ver todos los casos <span aria-hidden="true">→</span>
          </a>
        </div>

        <div className={styles.foot} aria-hidden="true">
          <span ref={countRef}>01 / 06</span>
          <i>
            <span ref={barRef} />
          </i>
        </div>
      </div>
    </section>
  );
}
