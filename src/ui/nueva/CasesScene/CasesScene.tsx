"use client";

import { useEffect, useRef } from "react";
import styles from "./CasesScene.module.css";

/**
 * Escena 4 · Casos reales, a pantalla completa.
 *
 * Cada vivienda vendida ocupa toda la pantalla. Al bajar, la foto siguiente
 * se abre desde el centro como una ventana hasta cubrirlo todo (con un zoom
 * lento) y su barrio entra en grande, con el precio y los días en venta.
 * Datos reales de la web actual. Las fotos son las que acompañan a cada caso
 * en esa web: orientativas (la mayoría generadas), y así se indica. Si llega
 * la foto real de un caso, se sustituye y se pone `real: true`.
 */

const CASES = [
  { barrio: "Ruzafa", rooms: "Piso · 3 habitaciones", price: "315.000 €", days: 14, img: "ruzafa", real: false },
  { barrio: "Benimaclet", rooms: "Piso · 4 habitaciones", price: "235.000 €", days: 19, img: "benimaclet", real: false },
  { barrio: "Ciutat Vella", rooms: "Piso · 2 habitaciones", price: "198.000 €", days: 12, img: "ciutat-vella", real: false },
  { barrio: "Cánovas", rooms: "Piso · 3 habitaciones", price: "385.000 €", days: 26, img: "canovas", real: false },
  { barrio: "Patraix", rooms: "Piso · 3 habitaciones", price: "205.000 €", days: 35, img: "patraix", real: false },
  { barrio: "Campanar", rooms: "Piso · 4 habitaciones", price: "365.000 €", days: 22, img: "campanar", real: false },
] as const;

const AVG_DAYS = Math.round(CASES.reduce((s, c) => s + c.days, 0) / CASES.length);

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
function ease(t: number) {
  const c = clamp01(t);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

export function CasesScene() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<Array<HTMLDivElement | null>>([]);
  const textsRef = useRef<Array<HTMLDivElement | null>>([]);
  const countRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const n = CASES.length;
    let raf = 0;
    let active = -2;

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const r = section.getBoundingClientRect();
      if (r.bottom < -100 || r.top > window.innerHeight + 100) return;
      const p = clamp01(-r.top / Math.max(1, r.height - window.innerHeight));
      // Recorrido de las seis viviendas en el 0–88 % de la escena.
      const flight = clamp01(p / 0.88) * n;

      layersRef.current.forEach((el, i) => {
        if (!el) return;
        // La primera ya está abierta; las demás se abren desde el centro.
        const open = i === 0 ? 1 : reduced ? (flight > i ? 1 : 0) : ease((flight - i + 0.15) / 0.6);
        const inset = (1 - open) * 34;
        const insetX = (1 - open) * 38;
        el.style.clipPath = `inset(${inset}% ${insetX}% ${inset}% ${insetX}% round ${(1 - open) * 16}px)`;
        el.style.visibility = open <= 0.001 ? "hidden" : "visible";
        // Zoom lento: entra cerca y se va alejando mientras está en pantalla.
        const life = clamp01((flight - i + 0.15) / 1.4);
        const img = el.firstElementChild as HTMLElement | null;
        if (img && !reduced) img.style.transform = `scale(${(1.28 - life * 0.2).toFixed(3)})`;
      });

      // El texto de la vivienda que está delante entra con su propio tiempo.
      const want = p > 0.9 ? -1 : Math.max(0, Math.min(n - 1, Math.floor(flight - 0.2)));
      if (want !== active) {
        active = want;
        textsRef.current.forEach((el, i) => {
          if (!el) return;
          el.dataset.state = i === active ? "in" : el.dataset.state === "in" ? "out" : el.dataset.state ?? "idle";
        });
        if (countRef.current && active >= 0) countRef.current.textContent = `${String(active + 1).padStart(2, "0")} / ${String(n).padStart(2, "0")}`;
      }
      if (barRef.current) barRef.current.style.transform = `scaleX(${clamp01(p / 0.88)})`;

      // Cierre: la imagen se oscurece y aparece la media de días.
      const e = ease((p - 0.88) / 0.1);
      stage.style.setProperty("--end", String(e));
      if (endRef.current) endRef.current.style.visibility = e < 0.01 ? "hidden" : "visible";
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <section ref={sectionRef} className={styles.scene} id="casos" aria-labelledby="cases-title" data-header-tone="dark" data-header-transparent="true">
      <div ref={stageRef} className={styles.stage}>
        {CASES.map((c, i) => (
          <div
            key={c.barrio}
            ref={(el) => {
              layersRef.current[i] = el;
            }}
            className={styles.layer}
            style={{ zIndex: i + 1 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/nueva/casos/${c.img}.webp`} alt={`Imagen orientativa del caso de ${c.barrio}`} loading="lazy" />
          </div>
        ))}
        <div className={styles.shade} aria-hidden="true" />

        <div className={styles.head}>
          <p className={styles.eyebrow}>Casos reales</p>
          <h2 id="cases-title" className={styles.srOnly}>
            Viviendas que hemos vendido en Valencia
          </h2>
        </div>

        {CASES.map((c, i) => (
          <div
            key={c.barrio}
            ref={(el) => {
              textsRef.current[i] = el;
            }}
            className={styles.text}
            data-state="idle"
          >
            <h3 className={styles.barrio}>
              <span className={styles.mask}>
                <span>{c.barrio}</span>
              </span>
            </h3>
            <p className={styles.data}>
              <span className={styles.mask}>
                <span style={{ transitionDelay: "120ms" }}>
                  <b>{c.price}</b>
                  <i>{c.rooms}</i>
                  <em>Vendido en {c.days} días</em>
                </span>
              </span>
            </p>
            {!c.real && <p className={styles.note}>Imagen orientativa</p>}
          </div>
        ))}

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
