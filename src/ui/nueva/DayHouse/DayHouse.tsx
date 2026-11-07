"use client";

import { useEffect, useRef, useState } from "react";
import { createDayHouseScene, textState, type DayHouseScene } from "@/motion/webgl/dayHouseScene";
import { requestHeaderToneRefresh } from "@/motion/core/events";
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
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clockRef = useRef<HTMLSpanElement>(null);
  const phaseRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const wordsRef = useRef<HTMLDivElement>(null);
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
        items: [],
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
    let activeWord = -2;
    let raf = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const r = section.getBoundingClientRect();
      const span = Math.max(1, r.height - window.innerHeight);
      const p = Math.min(1, Math.max(0, -r.top / span));
      scene?.setProgress(p);

      const phase = phaseAt(p);
      if (clockRef.current) clockRef.current.textContent = clockAt(p);
      // Tono del texto: tinta y logo rojo con el cielo claro de la mañana y
      // la tarde (y el atardecer, cuyo cielo es muy luminoso); crema de noche.
      const tone = p < 0.74 ? "dark" : "light";
      if (stageRef.current && stageRef.current.dataset.tone !== tone) {
        stageRef.current.dataset.tone = tone;

      }
      // Arriba del todo la cabecera se ve siempre; al bajar se esconde y
      // reaparece al acercar el ratón (comportamiento de la cabecera).
      const atTop = p < 0.015;
      if ((section.getAttribute("data-header-force-visible") === "true") !== atTop) {
        if (atTop) section.setAttribute("data-header-force-visible", "true");
        else section.removeAttribute("data-header-force-visible");
        requestHeaderToneRefresh();
      }
      if (phase !== lastPhase) {
        lastPhase = phase;
        if (phaseRef.current) phaseRef.current.textContent = `${PHASES[phase].label} · ${PHASES[phase].step}`;
        stepsRef.current?.querySelectorAll("li").forEach((li, i) => li.toggleAttribute("data-active", i <= phase));
      }
      if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
      const intro = Math.min(1, (now - start) / 3200);
      // Titulares: el scroll decide cuál toca; la entrada y la salida son
      // animaciones con tiempo propio (CSS), no ligadas al scroll, para que
      // se sientan naturales. Umbral con histéresis para no parpadear.
      const ts = textState(p, intro);
      const want = ts.amt > 0.45 ? ts.index : ts.amt < 0.2 ? -1 : activeWord;
      if (want !== activeWord) {
        activeWord = want;
        wordsRef.current?.querySelectorAll<HTMLElement>("[data-word]").forEach((el) => {
          const i = Number(el.dataset.word);
          el.dataset.state = i === activeWord ? "in" : el.dataset.state === "in" ? "out" : el.dataset.state ?? "idle";
        });
      }
      // Justo antes del relevo con la escena siguiente, la interfaz de la
      // portada se retira para que solo quede la casa.
      const exit = String(1 - Math.min(1, Math.max(0, (p - 0.93) / 0.06)));
      stageRef.current?.querySelectorAll<HTMLElement>("[data-exit]").forEach((el) => {
        el.style.opacity = exit;
      });
      // La tira superior se esconde y vuelve junto con la cabecera.
      const hdr = document.querySelector<HTMLElement>("[data-header]");
      const hdrHidden = hdr?.dataset.hidden === "true";
      const top = stageRef.current?.querySelector<HTMLElement>("[data-topline]");
      if (top && top.dataset.hdr !== String(hdrHidden)) {
        top.dataset.hdr = String(hdrHidden);
        top.style.transform = hdrHidden ? "translate3d(0, -160px, 0)" : "none";
      }
      if (hintRef.current) hintRef.current.style.opacity = String(Math.max(0, 1 - p * 18) * Math.min(1, Math.max(0, (now - start - 2600) / 900)));
    };
    raf = requestAnimationFrame(loop);

    const onPointer = (e: PointerEvent) => {
      scene?.setPointer((e.clientX / window.innerWidth - 0.5) * 2, (0.5 - e.clientY / window.innerHeight) * 2);
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    scene.ready.then(() => canvas.setAttribute("data-ready", "")).catch(() => setFallback(true));

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
      scene?.destroy();
    };
  }, [fontFamily]);

  return (
    <section ref={sectionRef} className={styles.scene} aria-labelledby="dayhouse-title" data-header-tone="dark" data-header-transparent="true" data-header-force-visible="true">
      <div ref={stageRef} className={styles.stage} data-tone="dark">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.poster} src={fallback ? "/nueva/atardecer.webp" : "/nueva/dia.webp"} alt="" fetchPriority="high" />
        {!fallback && <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />}


        {/* Tira superior bajo la cabecera, como en la portada anterior */}
        <div className={styles.topline} data-exit="" data-topline="">
          <span>Inmobiliaria en Valencia</span>
          <span>© {new Date().getFullYear()}</span>
        </div>

        <div ref={wordsRef} className={styles.words} aria-hidden="true" data-exit="">
          <div className={styles.word} data-word="0" data-state="idle" data-tone="dark">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.wordLogo} src="/nueva/logo-rojo.png" alt="" />
          </div>
          {PHASES.map((ph, i) => (
            <div key={ph.key} className={styles.word} data-word={i + 1} data-state="idle" data-tone={i < 3 ? "dark" : "light"}>
              <p className={styles.wordSub}>
                <span className={styles.mask}>
                  <span>{ph.sub}</span>
                </span>
              </p>
              <p className={styles.wordTitle}>
                {ph.word.split(" ").map((w, k) => (
                  <span key={k} className={styles.mask}>
                    <span style={{ transitionDelay: `${120 + k * 90}ms` }}>{w}</span>
                  </span>
                ))}
              </p>
            </div>
          ))}
        </div>

        <div className={styles.foot} data-exit="">
          <div className={styles.intro}>
            <h1 id="dayhouse-title" className={styles.title}>
              Vendemos tu vivienda en Valencia con estrategia, imagen y criterio.
            </h1>
            <a className={styles.circle} href="#valoracion">
              <span>
                Valora
                <br />
                tu
                <br />
                vivienda
              </span>
              <i aria-hidden="true">↗</i>
            </a>
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
