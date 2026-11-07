"use client";

import { useEffect, useRef } from "react";
import styles from "./MethodScene.module.css";
import { requestHeaderToneRefresh } from "@/motion/core/events";

/**
 * Escena 5 · Método (amanece un día nuevo).
 *
 * El vídeo de Marketing ocupa toda la pantalla con el titular; al bajar se
 * aleja hasta convertirse en la pieza central de tres paneles (Valoración,
 * Marketing, Negociación) sobre fondo crema. Mismo efecto que la sección
 * MarketingReel de la web anterior, reescrito para la web nueva: los tres
 * vídeos son siempre los mismos elementos <video> (no se recrean) y solo
 * cambian el tamaño y la posición de sus contenedores.
 */

const VIDEO = {
  valoracion: "https://yjjiwgpycvlmfyhypgun.supabase.co/storage/v1/object/public/web-videos/valoracion.mp4",
  marketing: "https://yjjiwgpycvlmfyhypgun.supabase.co/storage/v1/object/public/web-videos/video_marketing.mp4",
  negociacion: "https://yjjiwgpycvlmfyhypgun.supabase.co/storage/v1/object/public/web-videos/manos-v2.mp4",
};

const PANELS = [
  { key: "valoracion", n: "01", title: "Valoración estratégica", body: "Definimos el precio que genera interés, no el que inmoviliza la vivienda.", src: VIDEO.valoracion },
  { key: "marketing", n: "02", title: "Marketing que vende", body: "Construimos una presentación capaz de situarla ante el comprador adecuado.", src: VIDEO.marketing },
  { key: "negociacion", n: "03", title: "Negociación experta", body: "Protegemos el valor de la operación hasta el último acuerdo.", src: VIDEO.negociacion },
] as const;

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
function ease(t: number) {
  const c = clamp01(t);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function MethodScene() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const panelsRef = useRef<Array<HTMLElement | null>>([]);
  const headRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const videos = Array.from(stage.querySelectorAll("video"));
    videos.forEach((v) => v.play().catch(() => {}));
    // Los vídeos solo se reproducen cuando la escena está cerca de la pantalla.
    const io = new IntersectionObserver(
      (entries) => {
        const near = entries[0]?.isIntersecting ?? false;
        videos.forEach((v) => (near ? v.play().catch(() => {}) : v.pause()));
      },
      { rootMargin: "200px" },
    );
    io.observe(section);

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const r = section.getBoundingClientRect();
      if (r.bottom < -100 || r.top > window.innerHeight + 100) return;
      const p = reduced ? 1 : clamp01(-r.top / Math.max(1, r.height - window.innerHeight));
      const W = stage.clientWidth;
      const H = stage.clientHeight;
      const mobile = W < 760;

      // Tamaños finales de los paneles (centro un poco mayor).
      const cw = mobile ? W * 0.74 : W * 0.29;
      const ch = mobile ? H * 0.56 : H * 0.6;
      const sw = mobile ? W * 0.68 : W * 0.28;
      const sh = mobile ? H * 0.5 : H * 0.58;
      const gap = mobile ? W * 0.05 : W * 0.022;
      const radius = 22;

      // 1 · El vídeo central se aleja de pantalla completa a panel.
      const shrink = ease((p - 0.1) / 0.45);
      const center = panelsRef.current[1];
      if (center) {
        center.style.width = `${lerp(W, cw, shrink)}px`;
        center.style.height = `${lerp(H, ch, shrink)}px`;
        center.style.borderRadius = `${lerp(0, radius, shrink)}px`;
        center.style.transform = `translate3d(-50%, -50%, 0)`;
      }
      // 2 · Los paneles laterales entran desde los lados.
      const side = ease((p - 0.38) / 0.26);
      [0, 2].forEach((i) => {
        const el = panelsRef.current[i];
        if (!el) return;
        const dir = i === 0 ? -1 : 1;
        const finalX = dir * (cw / 2 + gap + sw / 2);
        const x = lerp(dir * (W / 2 + sw), finalX, side);
        el.style.width = `${sw}px`;
        el.style.height = `${sh}px`;
        el.style.borderRadius = `${radius}px`;
        el.style.opacity = String(side);
        el.style.transform = `translate3d(calc(-50% + ${x.toFixed(1)}px), -50%, 0)`;
      });
      // 3 · El titular desaparece al empezar a alejarse; entran los textos.
      if (headRef.current) {
        const h = 1 - clamp01((p - 0.08) / 0.12);
        headRef.current.style.opacity = String(h);
        headRef.current.style.transform = `translate3d(-50%, calc(-50% + ${(1 - h) * -30}px), 0)`;
      }
      // Cabecera: transparente y clara mientras el vídeo ocupa la pantalla.
      const full = shrink < 0.35;
      if ((section.getAttribute("data-header-tone") === "dark") !== full) {
        if (full) {
          section.setAttribute("data-header-tone", "dark");
          section.setAttribute("data-header-transparent", "true");
        } else {
          section.removeAttribute("data-header-tone");
          section.removeAttribute("data-header-transparent");
        }
        requestHeaderToneRefresh();
      }
      const copy = ease((p - 0.58) / 0.14);
      stage.style.setProperty("--copy", String(copy));
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, []);

  return (
    <section ref={sectionRef} className={styles.scene} id="vender" aria-labelledby="method-title">
      <div ref={stageRef} className={styles.stage}>
        {PANELS.map((pnl, i) => (
          <article
            key={pnl.key}
            ref={(el) => {
              panelsRef.current[i] = el;
            }}
            className={i === 1 ? `${styles.panel} ${styles.center}` : styles.panel}
          >
            <video className={styles.video} src={pnl.src} autoPlay muted loop playsInline preload={i === 1 ? "auto" : "metadata"} />
            <div className={styles.copy}>
              <span className={styles.n}>{pnl.n}</span>
              <h3 className={styles.panelTitle}>{pnl.title}</h3>
              <p className={styles.body}>{pnl.body}</p>
            </div>
          </article>
        ))}

        <div ref={headRef} className={styles.head}>
          <h2 id="method-title" className={styles.title}>
            Cada vivienda necesita <em>una estrategia propia.</em>
          </h2>
          <p className={styles.sub}>Valoramos. Posicionamos. Defendemos.</p>
        </div>
      </div>
    </section>
  );
}
