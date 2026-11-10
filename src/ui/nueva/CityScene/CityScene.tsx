"use client";

import { useEffect, useRef } from "react";
import styles from "./CityScene.module.css";

/**
 * Escena 3 · «De la ventana a la ciudad».
 *
 * Continúa donde acaba la portada (la casa de noche): la cámara se acerca a
 * la ventana iluminada hasta que su luz cálida llena la pantalla, la luz se
 * abre a Valencia en la hora azul y los barrios se encienden uno a uno, cada
 * uno con una vivienda vendida (datos reales de la web actual).
 */

// Ventana iluminada en la foto de noche (medida: luz de noche que no existe
// al atardecer, tonos cálidos).
const WINDOW = { x: 0.61, y: 0.5 };
const HOUSE_RATIO = 2; // 1536 × 768
const CITY_RATIO = 1717 / 916;

// Puntos sobre la vista de la ciudad (coordenadas de la foto). Es una vista
// evocadora, no un mapa: cada punto sitúa un barrio en el horizonte.
// Cada barrio es una ventana real de un edificio de la foto: son las únicas
// luces de la ciudad («cada luz es una vivienda que hemos vendido»).
const BARRIOS = [
  { name: "Benimaclet", x: 0.12, y: 0.47, rooms: "Piso · 4 hab.", price: "235.000 €", days: 19 },
  { name: "Ciutat Vella", x: 0.31, y: 0.617, rooms: "Piso · 2 hab.", price: "198.000 €", days: 12 },
  { name: "Campanar", x: 0.565, y: 0.47, rooms: "Piso · 4 hab.", price: "365.000 €", days: 22 },
  { name: "Patraix", x: 0.72, y: 0.6, rooms: "Piso · 3 hab.", price: "205.000 €", days: 35 },
  { name: "Ruzafa", x: 0.815, y: 0.47, rooms: "Piso · 3 hab.", price: "315.000 €", days: 14 },
  { name: "Cánovas", x: 0.905, y: 0.545, rooms: "Piso · 3 hab.", price: "385.000 €", days: 26 },
] as const;

const TITLE = "Valencia, barrio a barrio.";

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
function smooth(t: number) {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
}

/** Convierte un punto de la foto (0..1) a píxeles del contenedor con object-fit: cover. */
function coverPoint(w: number, h: number, ratio: number, fx: number, px: number, py: number) {
  const boxRatio = w / h;
  let iw: number;
  let ih: number;
  if (boxRatio > ratio) {
    iw = w;
    ih = w / ratio;
  } else {
    ih = h;
    iw = h * ratio;
  }
  const ox = (w - iw) * fx;
  const oy = (h - ih) * 0.5;
  return { x: ox + px * iw, y: oy + py * ih };
}

export function CityScene() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const houseRef = useRef<HTMLImageElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const cityRef = useRef<HTMLDivElement>(null);
  const pinsRef = useRef<HTMLUListElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const leadRef = useRef<HTMLParagraphElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const houseGradeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const words = Array.from(titleRef.current?.querySelectorAll<HTMLElement>("[data-w]") ?? []);
    const pins = Array.from(pinsRef.current?.querySelectorAll<HTMLElement>("li") ?? []);
    let raf = 0;
    let lastW = 0;
    let lastH = 0;

    const layout = () => {
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      if (w === lastW && h === lastH) return;
      lastW = w;
      lastH = h;
      const mobile = w < 760;
      const houseFx = mobile ? 0.68 : 0.5;
      if (houseRef.current) {
        houseRef.current.style.objectPosition = `${houseFx * 100}% 50%`;
        const o = coverPoint(w, h, HOUSE_RATIO, houseFx, WINDOW.x, WINDOW.y);
        houseRef.current.style.transformOrigin = `${o.x}px ${o.y}px`;
        if (glowRef.current) {
          glowRef.current.style.setProperty("--gx", `${o.x}px`);
          glowRef.current.style.setProperty("--gy", `${o.y}px`);
        }
      }
      const cityFx = mobile ? 0.55 : 0.5;

      cityRef.current?.style.setProperty("--city-pos", `${cityFx * 100}% 50%`);
      pins.forEach((li, i) => {
        const b = BARRIOS[i];
        // En móvil solo se ve una franja vertical de la foto: los barrios se
        // colocan en dos columnas escalonadas sobre el cielo y los tejados.
        const pt = mobile
          ? { x: w * (i % 2 === 0 ? 0.08 : 0.5), y: h * (0.14 + i * 0.075) }
          : coverPoint(w, h, CITY_RATIO, cityFx, b.x, b.y);
        li.style.left = `${pt.x}px`;
        li.style.top = `${pt.y}px`;
        li.toggleAttribute("data-offscreen", pt.x < 24 || pt.x > w - 24);
        li.toggleAttribute("data-flip", pt.x > w * 0.72);
      });
    };

    const loop = () => {
      raf = requestAnimationFrame(loop);
      layout();
      const r = section.getBoundingClientRect();
      const p = clamp01(-r.top / Math.max(1, r.height - window.innerHeight));
      // La escena se solapa con la última pantalla de la portada: no se
      // muestra hasta que llega arriba del todo, justo en el relevo.
      const show = r.top <= 1;
      if (stage.style.visibility !== (show ? "visible" : "hidden")) stage.style.visibility = show ? "visible" : "hidden";
      if (r.bottom < -100 || r.top > window.innerHeight + 100) return;

      // 1 · La cámara se acerca a la ventana y su luz llena la pantalla.
      const zoom = reduced ? 0 : Math.pow(smooth(p / 0.3), 2.2);
      if (houseRef.current) {
        houseRef.current.style.transform = `scale(${1.02 + zoom * 5.5})`;
        houseRef.current.style.opacity = String(1 - smooth((p - 0.3) / 0.04));
        if (houseGradeRef.current) houseGradeRef.current.style.opacity = String(1 - smooth(p / 0.12));
      }
      const glow = smooth((p - 0.1) / 0.2) * (1 - smooth((p - 0.31) / 0.14));
      if (glowRef.current) {
        glowRef.current.style.opacity = String(glow);
        glowRef.current.style.setProperty("--gr", `${20 + smooth(p / 0.3) * 120}vmax`);
      }
      // 2 · La luz se abre a la ciudad en la hora azul.
      const city = smooth((p - 0.27) / 0.12);
      if (cityRef.current) {
        cityRef.current.style.opacity = String(city);
        cityRef.current.style.transform = `scale(${1.14 - smooth((p - 0.27) / 0.4) * 0.14})`;
      }
      if (copyRef.current) copyRef.current.style.opacity = String(city);

      // 3 · El titular se enciende palabra a palabra y los barrios, uno a uno.
      const fill = (p - 0.38) / 0.16;
      words.forEach((el, i) => {
        el.style.setProperty("--f", String(smooth(fill * words.length - i)));
      });
      if (leadRef.current) leadRef.current.style.opacity = String(smooth((p - 0.5) / 0.06));
      pins.forEach((li, i) => {
        const on = p > 0.5 + i * 0.065;
        if (li.hasAttribute("data-on") !== on) li.toggleAttribute("data-on", on);
      });
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <section ref={sectionRef} className={styles.scene} aria-labelledby="city-title" data-header-tone="dark" data-header-transparent="true">
      <div ref={stageRef} className={styles.stage}>
        <div ref={cityRef} className={styles.city}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.cityImg} src="/nueva/valencia.webp" alt="Valencia vista desde arriba en la hora azul" loading="lazy" />
          <div className={styles.cityGrade} aria-hidden="true" />
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={houseRef} className={styles.house} src="/nueva/noche.webp" alt="" aria-hidden="true" loading="lazy" decoding="async" />
        <div ref={houseGradeRef} className={styles.houseGrade} aria-hidden="true" />
        <div ref={glowRef} className={styles.glow} aria-hidden="true" />

        <div ref={copyRef} className={styles.copy}>
          <p className={styles.eyebrow}>Dónde vendemos</p>
          <h2 ref={titleRef} id="city-title" className={styles.title}>
            {TITLE.split(" ").map((w, i) => (
              <span key={i} data-w="">
                {w}{" "}
              </span>
            ))}
          </h2>
          <p ref={leadRef} className={styles.lead}>
            Cada ventana encendida es una vivienda que hemos vendido: el precio y los días que estuvo a la venta.
          </p>
        </div>

        <ul ref={pinsRef} className={styles.pins}>
          {BARRIOS.map((b) => (
            <li key={b.name} className={styles.pin}>
              <span className={styles.dot} aria-hidden="true" />
              <span className={styles.label}>
                <strong>{b.name}</strong>
                <span>
                  {b.rooms} · {b.price}
                </span>
                <em>Vendido en {b.days} días</em>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
