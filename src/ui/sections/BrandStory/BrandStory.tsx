"use client";

import { useRef, type CSSProperties } from "react";
import Image from "next/image";
import { useBrandStory } from "@/motion/hooks/useBrandStory";
import styles from "./BrandStory.module.css";

type RevealShape = "ellipse" | "ellipse-wide";

type Step = {
  number: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  lineArt: string;
  lineArtAlt: string;
  tag: string;
  revealOriginX: number;
  revealOriginY: number;
  revealShape: RevealShape;
};

// 2026-08-24: la línea vertical pasa a ser el controlador narrativo real
// (mockup aprobado) -- cada paso ya no es solo texto+foto, también lleva
// un recorte lineal (SVG, public/images/story/line/) que se transforma en
// fotografía mediante un clip-path que nace de un punto concreto del
// objeto (revealOriginX/Y, en % dentro de .rowVisual) -- nunca un wipe
// rectangular genérico. revealShape "ellipse-wide" es solo para el plano
// (02): una elipse achatada para sugerir que se despliega de lado, en vez
// del iris circular que usan el resto.
const STEPS: Step[] = [
  {
    number: "01",
    title: "Escuchamos",
    description:
      "Una conversación sincera para comprender tu situación, tus objetivos y lo que realmente necesitas.",
    image: "/images/story/objects/story-key.webp",
    imageAlt: "",
    lineArt: "/images/story/line/story-key-line.svg",
    lineArtAlt: "",
    tag: "TODO EMPIEZA AQUÍ",
    revealOriginX: 38,
    revealOriginY: 62,
    revealShape: "ellipse",
  },
  {
    number: "02",
    title: "Diseñamos la estrategia",
    description: "Analizamos el mercado y trazamos el camino adecuado para defender el valor de tu propiedad.",
    image: "/images/story/objects/story-blueprint.webp",
    imageAlt: "",
    lineArt: "/images/story/line/story-blueprint-line.svg",
    lineArtAlt: "",
    tag: "LA ESTRATEGIA IMPORTA",
    revealOriginX: 12,
    revealOriginY: 55,
    revealShape: "ellipse-wide",
  },
  {
    number: "03",
    title: "Preparamos cada detalle",
    description: "Fotografía, vídeo, presentación y posicionamiento. Todo debe estar preparado antes de salir al mercado.",
    image: "/images/story/objects/story-camera.webp",
    imageAlt: "",
    lineArt: "/images/story/line/story-camera-line.svg",
    lineArtAlt: "",
    tag: "CADA DETALLE CUENTA",
    revealOriginX: 46,
    revealOriginY: 48,
    revealShape: "ellipse",
  },
  {
    number: "04",
    title: "Negociamos",
    description: "Gestionamos las visitas, defendemos tus intereses y coordinamos cada decisión de la operación.",
    image: "/images/story/objects/story-contract.webp",
    imageAlt: "",
    lineArt: "/images/story/line/story-contract-line.svg",
    lineArtAlt: "",
    tag: "TUS INTERESES, PRIMERO",
    revealOriginX: 68,
    revealOriginY: 78,
    revealShape: "ellipse",
  },
  {
    number: "05",
    title: "Te acompañamos",
    description: "Desde el primer contacto hasta la firma y mucho después de entregar las llaves.",
    image: "/images/story/objects/story-handover.webp",
    imageAlt: "",
    lineArt: "/images/story/line/story-handover-line.svg",
    lineArtAlt: "",
    tag: "MUCHO DESPUÉS DE LAS LLAVES",
    revealOriginX: 50,
    revealOriginY: 45,
    revealShape: "ellipse",
  },
];

type RowVars = CSSProperties & { "--reveal-x"?: string; "--reveal-y"?: string };

// El recorrido -- capítulo final antes de Contact/Footer. Tres zonas:
// foto+titular estables a la izquierda, línea+nodos+punto ascendente al
// centro (dentro de .rows, ver CSS), lista de etapas a la derecha (una
// expandida/activa, cuatro compactas). Motor en useBrandStory.ts: GSAP +
// ScrollTrigger (un único pin/timeline para todo el módulo, igual que
// useProcess.ts/useTeamFanEntrance.ts), no el motor scroll+rAF de la
// ronda anterior.
export function BrandStory() {
  const sectionRef = useRef<HTMLElement>(null);
  useBrandStory({ sectionRef });

  return (
    <section className={styles.brandStory} data-brand-story aria-label="El recorrido junto a ti" ref={sectionRef}>
        <div className={styles.backgroundPhoto} aria-hidden="true">
          <Image
            src="/images/story/background/story-background.webp"
            alt=""
            fill
            sizes="100vw"
            quality={75}
            className={styles.backgroundPhotoImg}
          />
          <div className={styles.backgroundOverlay} />
        </div>

        <div className={styles.storyGrid}>
          <div className={styles.titular}>
            <p className={styles.eyebrow}>Servicios</p>
            <h2 className={styles.titularHeading}>
              <span className={styles.titularLine}>Desde el</span>
              <span className={styles.titularAccent}>primer</span>
              <span className={styles.titularLine}>contacto</span>
            </h2>
            <span className={styles.titularDivider} aria-hidden="true" />
            <p className={styles.titularSupport}>Cada decisión inmobiliaria empieza de una manera distinta.</p>
          </div>

          <ol className={styles.rows} data-story-rows>
            <div className={styles.routeLine} aria-hidden="true" />
            <div className={styles.routeFill} data-story-line aria-hidden="true" />
            <div className={styles.routePoint} data-story-point aria-hidden="true" />

            {STEPS.map((step, index) => (
              <li
                key={step.number}
                className={styles.row}
                data-story-row
                data-story-row-index={index}
                data-story-row-state={index === 0 ? "active" : "future"}
              >
                <span className={styles.rowNode} data-story-node aria-hidden="true">
                  <span className={styles.rowNodeDot} data-story-node-dot />
                  <span className={styles.rowNodeHalo} data-story-node-halo />
                  <span className={styles.rowNodeArc} data-story-node-arc />
                </span>
                <span className={styles.rowNumber}>{step.number}</span>

                <div className={styles.rowContent}>
                  <h3 className={styles.rowTitle}>{step.title}</h3>
                  <p className={styles.rowDesc}>{step.description}</p>
                  <span className={styles.rowDivider} aria-hidden="true" />
                  <span className={styles.rowTag}>{step.tag}</span>
                </div>

                <div
                  className={styles.rowVisual}
                  data-story-visual
                  data-reveal-shape={step.revealShape}
                  style={{ "--reveal-x": `${step.revealOriginX}%`, "--reveal-y": `${step.revealOriginY}%` } as RowVars}
                >
                  <img className={styles.rowLineArt} src={step.lineArt} alt={step.lineArtAlt} aria-hidden="true" />
                  <Image
                    className={styles.rowPhoto}
                    src={step.image}
                    alt={step.imageAlt}
                    fill
                    sizes="(max-width: 900px) 60vw, 22vw"
                  />
                </div>
              </li>
            ))}
          </ol>
        </div>
    </section>
  );
}
