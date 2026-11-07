"use client";

import { useEffect, useRef } from "react";
import styles from "./TeamScene.module.css";

/**
 * Escena · «El hilo granate» (equipo).
 *
 * Retratos reales en blanco y negro con la americana granate de la marca en
 * color: unifica fondos distintos y convierte el granate en el hilo visual.
 * Apertura con la foto de grupo a pantalla completa y el titular; después, los
 * nombres a la izquierda como créditos (se ilumina uno cada vez), el
 * retrato a la derecha con cortinilla vertical y su frase debajo.
 * Cierre: «Habla con una persona, no con una centralita».
 */

const TEAM = [
  { slug: "jordi-osca", name: "Jordi Osca", role: "Gerente", quote: "Estar presente cuando más se necesita también forma parte de hacer bien nuestro trabajo." },
  { slug: "eva-garcia", name: "Eva García", role: "Directora comercial", quote: "Escuchar de verdad es el primer paso para acompañar bien cada decisión." },
  { slug: "angeles-albelda", name: "Ángeles Albelda", role: "Coordinación", quote: "Me gusta que cada persona sienta que todo está cuidado, incluso aquello que no se ve." },
  { slug: "sem-fernandez", name: "Sem Fernández", role: "Agente de propietarios", quote: "Detrás de cada vivienda hay una historia que merece ser entendida y defendida." },
  { slug: "felipe-martinez", name: "Felipe Martínez", role: "Agente de propietarios", quote: "La confianza se construye hablando claro y estando cerca durante todo el camino." },
  { slug: "jorge-garcia", name: "Jorge García", role: "Agente de compradores", quote: "Encontrar una casa también es descubrir el lugar donde alguien empezará una nueva etapa." },
  // Sin frase todavía: no se le atribuyen palabras que no ha dicho.
  { slug: "clara-vazquez", name: "Clara Vázquez", role: "Agente de propietarios", quote: "" },
] as const;

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
function ease(t: number) {
  const c = clamp01(t);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

export function TeamScene() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const namesRef = useRef<HTMLOListElement>(null);
  const portraitsRef = useRef<Array<HTMLDivElement | null>>([]);
  const quotesRef = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const n = TEAM.length;
    const names = Array.from(namesRef.current?.querySelectorAll("li") ?? []);
    let raf = 0;
    let active = -2;

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const r = section.getBoundingClientRect();
      if (r.bottom < -100 || r.top > window.innerHeight + 100) return;
      const p = clamp01(-r.top / Math.max(1, r.height - window.innerHeight));

      // Apertura (0–14 %) → recorrido de las siete personas (16–88 %) → cierre.
      const intro = 1 - ease((p - 0.08) / 0.08);
      stage.style.setProperty("--intro", String(intro));
      const flight = clamp01((p - 0.16) / 0.72) * n;
      const end = ease((p - 0.9) / 0.07);
      stage.style.setProperty("--end", String(end));
      stage.toggleAttribute("data-end", end > 0.01);

      portraitsRef.current.forEach((el, i) => {
        if (!el) return;
        const open = i === 0 ? ease((p - 0.1) / 0.08) : reduced ? (flight > i ? 1 : 0) : ease((flight - i + 0.1) / 0.45);
        el.style.clipPath = `inset(${((1 - open) * 100).toFixed(2)}% 0 0 0)`;
        const img = el.firstElementChild as HTMLElement | null;
        if (img && !reduced) img.style.transform = `scale(${(1.12 - open * 0.12).toFixed(3)})`;
      });

      const want = p < 0.12 ? -1 : p > 0.9 ? -1 : Math.min(n - 1, Math.floor(flight));
      if (want !== active) {
        active = want;
        names.forEach((li, i) => li.toggleAttribute("data-active", i === active));
        quotesRef.current.forEach((el, i) => {
          if (!el) return;
          el.dataset.state = i === active ? "in" : el.dataset.state === "in" ? "out" : el.dataset.state ?? "idle";
        });
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <section ref={sectionRef} className={styles.scene} id="equipo" aria-labelledby="team-title" data-header-tone="dark" data-header-transparent="true">
      <div ref={stageRef} className={styles.stage}>
        {/* Apertura: la foto de grupo a pantalla completa */}
        <div className={styles.intro}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.group} src="/nueva/equipo/equipo-reference-home.webp" alt="El equipo de Reference Home" loading="lazy" />
        </div>
        <div className={styles.head}>
          <p className={styles.eyebrow}>Nuestro equipo</p>
          <h2 id="team-title" className={styles.title}>
            Siete personas. <em>Una forma de hacer.</em>
          </h2>
        </div>

        {/* Créditos: nombres a la izquierda */}
        <ol ref={namesRef} className={styles.names}>
          {TEAM.map((m, i) => (
            <li key={m.slug}>
              <span className={styles.idx}>{String(i + 1).padStart(2, "0")}</span>
              <span className={styles.name}>{m.name}</span>
              <span className={styles.role}>{m.role}</span>
            </li>
          ))}
        </ol>

        {/* Retrato con cortinilla vertical */}
        <div className={styles.frame}>
          {TEAM.map((m, i) => (
            <div
              key={m.slug}
              ref={(el) => {
                portraitsRef.current[i] = el;
              }}
              className={styles.portrait}
              style={{ zIndex: i + 1 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/nueva/equipo/${m.slug}.webp`} alt={`${m.name}, ${m.role} en Reference Home`} loading="lazy" />
            </div>
          ))}
        </div>

        {/* Frase de cada persona */}
        <div className={styles.quotes}>
          {TEAM.map((m, i) => (
            <div
              key={m.slug}
              ref={(el) => {
                quotesRef.current[i] = el;
              }}
              className={styles.quote}
              data-state="idle"
            >
              <p className={styles.mobileName}>
                <span className={styles.mask}>
                  <span>{m.name}</span>
                </span>
                <small>{m.role}</small>
              </p>
              {m.quote && (
                <blockquote>
                  <span className={styles.mask}>
                    <span style={{ transitionDelay: "120ms" }}>«{m.quote}»</span>
                  </span>
                </blockquote>
              )}
            </div>
          ))}
        </div>

        {/* Cierre */}
        <div className={styles.end}>
          <p className={styles.endTitle}>
            Habla con una persona, <em>no con una centralita.</em>
          </p>
          <div className={styles.endLinks}>
            <a href="tel:+34963547596">963 547 596</a>
            <a href="https://wa.me/34674612272" target="_blank" rel="noopener noreferrer">
              WhatsApp
            </a>
            <a href="#contacto">Escríbenos</a>
          </div>
        </div>
      </div>
    </section>
  );
}
