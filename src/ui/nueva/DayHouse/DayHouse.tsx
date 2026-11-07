"use client";

import { useEffect, useRef, useState } from "react";
import { createDayHouseScene, textState, type DayHouseScene } from "@/motion/webgl/dayHouseScene";
import styles from "./DayHouse.module.css";

const PHASES = [
  { key: "manana", label: "Mañana", step: "Valorar", word: "Se valora.", sub: "Un precio realista, con ventas reales de tu barrio." },
  { key: "tarde", label: "Tarde", step: "Mostrar", word: "Se muestra.", sub: "Fotografía, vídeo y un plan para llegar al comprador adecuado." },
  { key: "atardecer", label: "Atardecer", step: "Negociar", word: "Se negocia.", sub: "Defendemos cada euro, con compradores ya filtrados." },
  { key: "noche", label: "Noche", step: "Vender", word: "Se vende.", sub: "Te acompañamos hasta la notaría. Y después." },
] as const;

const PHASE_EDGES = [0.21, 0.48, 0.76];

function phaseAt(p: number) {
  if (p < PHASE_EDGES[0]) return 0;
  if (p < PHASE_EDGES[1]) return 1;
  if (p < PHASE_EDGES[2]) return 2;
  return 3;
}

function clockAt(p: number) {
  const minutes = Math.round(7.5 * 60 + p * 16 * 60);
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function DayHouse({ fontFamily }: { fontFamily: string }) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clockRef = useRef<HTMLSpanElement>(null);
  const phaseRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<HTMLOListElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return;
    const mobile = window.matchMedia("(max-width: 760px)").matches;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let scene: DayHouseScene | null = null;
    try {
      scene = createDayHouseScene(canvas, {
        images: ["/nueva/dia.webp", "/nueva/tarde.webp", "/nueva/atardecer.webp", "/nueva/noche.webp"],
        items: [{ kind: "image", src: "/nueva/logo-blanco.png" }, ...PHASES.map((ph) => ({ kind: "text" as const, text: ph.word }))],
        fontFamily,
        mobile,
        reducedMotion,
      });
    } catch {
      queueMicrotask(() => setFallback(true));
      return;
    }

    const start = performance.now();
    let lastPhase = -1;
    let raf = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const r = section.getBoundingClientRect();
      const span = Math.max(1, r.height - window.innerHeight);
      const p = Math.min(1, Math.max(0, -r.top / span));
      scene?.setProgress(p);

      const phase = phaseAt(p);
      if (clockRef.current) clockRef.current.textContent = clockAt(p);
      if (phase !== lastPhase) {
        lastPhase = phase;
        if (phaseRef.current) phaseRef.current.textContent = `${PHASES[phase].label} · ${PHASES[phase].step}`;
        stepsRef.current?.querySelectorAll("li").forEach((li, i) => li.toggleAttribute("data-active", i <= phase));
      }
      if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
      const intro = Math.min(1, (now - start) / 3200);
      const ts = textState(p, intro);
      if (subRef.current) {
        if (ts.index >= 1) {
          const text = PHASES[ts.index - 1].sub;
          if (subRef.current.textContent !== text) subRef.current.textContent = text;
          subRef.current.style.opacity = String(Math.max(0, ts.amt * 1.4 - 0.4));
          subRef.current.style.transform = `translate3d(0, ${(1 - ts.amt) * 14}px, 0)`;
        } else {
          subRef.current.style.opacity = "0";
        }
      }
      if (hintRef.current) hintRef.current.style.opacity = String(Math.max(0, 1 - p * 18) * Math.min(1, Math.max(0, (now - start - 2600) / 900)));
    };
    raf = requestAnimationFrame(loop);

    const onPointer = (e: PointerEvent) => {
      scene?.setPointer((e.clientX / window.innerWidth - 0.5) * 2, (0.5 - e.clientY / window.innerHeight) * 2);
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    scene.ready.catch(() => setFallback(true));

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
      scene?.destroy();
    };
  }, [fontFamily]);

  return (
    <section ref={sectionRef} className={styles.scene} aria-labelledby="dayhouse-title">
      <div className={styles.stage}>
        {fallback ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.fallback} src="/nueva/atardecer.webp" alt="" />
        ) : (
          <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
        )}

        <header className={styles.bar}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.logo} src="/nueva/logo-blanco.png" alt="Reference Home" width={1600} height={229} />
          <nav className={styles.nav} aria-label="Principal">
            <a href="#vender">Vender</a>
            <a href="#comprar">Comprar</a>
            <a href="#barrios">Barrios</a>
            <a href="#equipo">Nosotros</a>
          </nav>
          <a className={styles.cta} href="#valoracion">
            Valora tu vivienda
          </a>
        </header>

        <p ref={subRef} className={styles.sub} aria-hidden="true" />

        <div className={styles.foot}>
          <div className={styles.intro}>
            <p className={styles.eyebrow}>Inmobiliaria en Valencia</p>
            <h1 id="dayhouse-title" className={styles.title}>
              Vendemos tu vivienda en Valencia con estrategia, imagen y criterio.
            </h1>
          </div>
          <div className={styles.day}>
            <div className={styles.dayTop}>
              <span ref={clockRef} className={styles.clock}>
                07:30
              </span>
              <span ref={phaseRef} className={styles.phase}>
                Mañana · Valorar
              </span>
            </div>
            <span className={styles.track} aria-hidden="true">
              <span ref={barRef} className={styles.fill} />
            </span>
            <ol ref={stepsRef} className={styles.steps}>
              {PHASES.map((ph) => (
                <li key={ph.key}>
                  <strong>{ph.word}</strong> <span>{ph.sub}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div ref={hintRef} className={styles.hint} aria-hidden="true">
          <span>Desliza y vive un día en esta casa</span>
          <i />
        </div>
      </div>
    </section>
  );
}
