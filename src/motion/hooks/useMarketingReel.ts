"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "../core/media";
import { subscribeFrame } from "../core/frameTicker";
import { requestHeaderToneRefresh } from "../core/events";

let pluginRegistered = false;

// Umbral de tono del header (2026-07-28): coincide con el punto en que
// empieza la contracción (0.3, ya existente en el timeline de abajo) --
// justo antes de eso el vídeo sigue a pantalla completa cubriendo el área
// del logo (oscuro, logo blanco); apenas arranca la contracción, el panel
// se encoge hacia su alto final (58vh, centrado) y dentro de muy poco dista
// del borde superior, dejando ver el fondo nude bajo el header (claro,
// logo rojo). Mismo mecanismo que useWorkZoom.ts -- la sección decide su
// propio tono vía data-header-tone, el header no sabe nada de esta escena.
const HEADER_DARK_UNTIL = 0.3;

// Umbral de "paneles listos" (2026-07-28, corrección del CTA "Descubrir"):
// la interacción de hover de los tres paneles (overlay, CTA centrado, dim
// del copy, zoom de vídeo, cursor -- ver MarketingReel.module.css,
// [data-panels-ready]) solo debe existir cuando la composición final está
// prácticamente asentada, nunca durante fullscreen/inmersión/contracción.
// Dos umbrales (no uno solo) para evitar parpadeo si el scroll oscila justo
// en el límite -- se activa un poco más tarde (0.81) de lo que se
// desactiva (0.78), ambos dentro del rango pedido (~78-82%).
const PANELS_READY_ENTER = 0.81;
const PANELS_READY_EXIT = 0.78;

// Los tres paneles conservan el mismo peso estratégico -- mismo radio,
// mismo copy, misma interacción. Único matiz (2026-07-28, cuarta ronda):
// el panel 02 termina un +4% más grande que 01/03 (continuidad
// cinematográfica de venir de la fase fullscreen), nunca por encima de
// 1.06 en escala visual -- se percibe como profundidad, no como
// jerarquía. 01/03 no cambian.
const PANEL_WIDTH_FRAC = 0.28; // 28vw -- tamaño final de los paneles 01/03, sin cambios
const PANEL_HEIGHT_FRAC = 0.58; // 58vh -- ídem
const PANEL2_SCALE = 1.04; // +4%, tope explícito 1.06
const PANEL2_WIDTH_FRAC = PANEL_WIDTH_FRAC * PANEL2_SCALE;
const PANEL2_HEIGHT_FRAC = PANEL_HEIGHT_FRAC * PANEL2_SCALE;
const PANEL_RADIUS = 26; // px -- igual en los tres, no se toca esta ronda
const OBJECT_POSITION_FULLSCREEN = "50% 50%";
const OBJECT_POSITION_PANEL = "50% 42%"; // encuadre del panel final -- revisar tras ver el vídeo real

/**
 * Escena de vídeo a pantalla completa que se contrae hasta convertirse en
 * el panel central de una composición final de tres vídeos con el mismo
 * peso visual (2026-07-28).
 *
 * El <video> de Marketing (`videoRef`) es el MISMO elemento durante todo
 * el recorrido -- nunca se recrea, nunca se reinicia, su `src` no cambia.
 * `videoShell` (posición, tamaño animado, border-radius) sigue exactamente
 * igual que en la versión ya aprobada.
 *
 * Ningún vídeo se escala nunca de forma no uniforme: solo cambian
 * width/height reales de cada contenedor (`videoShell` animado por GSAP;
 * los paneles laterales con tamaño CSS fijo en vw/vh, igual que el
 * destino de la contracción). Cada <video> se queda siempre en
 * width:100%/height:100% + object-fit:cover.
 *
 * Reproducción: los tres vídeos se reproducen desde el montaje y NUNCA se
 * pausan por visibilidad (sin IntersectionObserver aquí) -- deben seguir
 * en bucle continuo aunque el bloque salga parcialmente del viewport, tal
 * como se pidió explícitamente. `autoPlay`/`muted`/`loop`/`playsInline` en
 * el propio <video> (ver MarketingReel.tsx) cubren el arranque; la
 * llamada a `.play()` de aquí es solo el refuerzo habitual para
 * navegadores que no autoarrancan un <video> recién montado sin un gesto
 * previo.
 *
 * Un único suscriptor a frameTicker.ts para sincronizar
 * ScrollTrigger.update() con el mismo RAF compartido que ya conduce
 * Lenis -- nunca un bucle propio (GSAP arranca su propio ticker interno
 * en cuanto existe una animación; eso es interno a la librería).
 *
 * Bajo prefers-reduced-motion no se registra ScrollTrigger: se fija
 * directamente el estado final (los tres vídeos ya en su tamaño de
 * panel, siguen reproduciéndose en bucle) -- sin pin, la sección se
 * desplaza como cualquier otra, así que tampoco necesita una salida
 * escalonada propia.
 *
 * Salida escalonada (2026-07-28): última fase de la MISMA timeline
 * (0.88 -> 0.995 de progreso), izquierda a derecha (01, luego 02, luego
 * 03), cada panel en dos fases sin easing propio (ease:"none", el scrub
 * ya hace de curva) para simular elasticidad sin springs: fase A sube y
 * expande levemente (y:0->-92, scale:1->1.012, opacity:1->0.72), fase B
 * extiende hasta el valor final (y/scale/opacity/rotateZ). El fondo y el
 * pin de stickyStage no se tocan -- solo los wrappers que ya anima la
 * entrada (`panel1Motion`/`shell`/`panel3Motion`) y sus copys
 * (`panel1Copy`/`panel2Copy`/`panel3Copy`, con ~4.5% de retraso). El
 * panel 02 sale con el mismo tratamiento que 01/03, sin volver a pantalla
 * completa. Reversible de fábrica: es un tween scrubbed, no una
 * animación de una sola pasada.
 *
 * Tono del header (2026-07-28): igual que useWorkZoom.ts, la propia
 * sección decide cuándo es "oscura" vía data-header-tone, sin que Header
 * conozca esta escena. Oscuro mientras el vídeo sigue a pantalla completa
 * (progress < HEADER_DARK_UNTIL); claro en cuanto empieza a contraerse,
 * ya que el panel encogido (58vh, centrado) deja ver enseguida el fondo
 * nude bajo el header, y se mantiene claro durante toda la composición de
 * tres paneles y su salida. requestHeaderToneRefresh() dispara el
 * recálculo en el mismo frame en que cambia, sin esperar al próximo
 * evento de scroll.
 */
export function useMarketingReel() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // Panel 02 -- Marketing (vídeo existente, sin recrear).
  const shellRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const panel2CopyRef = useRef<HTMLDivElement>(null);

  // Panel 01 -- Valoración.
  const panel1MotionRef = useRef<HTMLElement>(null);
  const panel1VideoRef = useRef<HTMLVideoElement>(null);
  const panel1CopyRef = useRef<HTMLDivElement>(null);

  // Panel 03 -- Negociación.
  const panel3MotionRef = useRef<HTMLElement>(null);
  const panel3VideoRef = useRef<HTMLVideoElement>(null);
  const panel3CopyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const shell = shellRef.current;
    const video = videoRef.current;
    const copy = copyRef.current;
    const panel2Copy = panel2CopyRef.current;
    const panel1Motion = panel1MotionRef.current;
    const panel1Video = panel1VideoRef.current;
    const panel1Copy = panel1CopyRef.current;
    const panel3Motion = panel3MotionRef.current;
    const panel3Video = panel3VideoRef.current;
    const panel3Copy = panel3CopyRef.current;
    if (
      !section ||
      !stage ||
      !shell ||
      !video ||
      !copy ||
      !panel2Copy ||
      !panel1Motion ||
      !panel1Video ||
      !panel1Copy ||
      !panel3Motion ||
      !panel3Video ||
      !panel3Copy
    )
      return;

    [video, panel1Video, panel3Video].forEach((v) => v.play().catch(() => {}));

    const isMobileViewport = window.matchMedia("(max-width: 640px)").matches;

    if (prefersReducedMotion()) {
      if (isMobileViewport) {
        // Móvil: el tamaño de tarjeta ya lo da el CSS
        // (MarketingReel.module.css, @media max-width:640px) -- nada de
        // width/height por JS aquí, a diferencia de escritorio, que no
        // tiene ningún tamaño de respaldo en CSS para .videoShell.
        gsap.set(video, { objectPosition: OBJECT_POSITION_PANEL });
      } else {
        gsap.set(shell, {
          width: window.innerWidth * PANEL2_WIDTH_FRAC,
          height: window.innerHeight * PANEL2_HEIGHT_FRAC,
          borderRadius: PANEL_RADIUS,
        });
        gsap.set(video, { objectPosition: OBJECT_POSITION_PANEL });
      }
      gsap.set(copy, { opacity: 0 });
      gsap.set(panel2Copy, { opacity: 1, y: 0 });
      gsap.set([panel1Motion, panel3Motion], { opacity: 1, x: 0, y: 0, scale: 1 });
      // Estado final estático = composición ya formada: el hover de los
      // tres paneles debe estar disponible desde ya (no hay ScrollTrigger
      // aquí que lo active más tarde).
      stage.setAttribute("data-panels-ready", "true");
      return;
    }

    if (!pluginRegistered) {
      gsap.registerPlugin(ScrollTrigger);
      pluginRegistered = true;
    }

    if (isMobileViewport) {
      // ---- Móvil (2026-07-28, corrección dedicada): nada de pin, nada
      // de fullscreen, nada de contracción -- "no intentes comprimir la
      // composición de escritorio, móvil necesita una solución
      // específica". Los tres vídeos ya están en su tamaño de tarjeta
      // final (CSS) desde el montaje, apilados en orden visual Marketing
      // -> Valoración -> Negociación (order en CSS, sin tocar el orden
      // real del DOM/JSX). Cada tarjeta tiene un único ScrollTrigger NO
      // pinned (sin spacer, sin RAF propio -- se sincroniza con el mismo
      // frameTicker de siempre) que la revela al entrar y le da un ligero
      // "lift" (translateY negativo real, no opacity ni visibility) justo
      // al cruzar el borde superior del viewport -- la desaparición
      // principal la produce el scroll nativo, no ninguna capa que la
      // tape.
      gsap.set(shell, { clearProps: "width,height,xPercent,yPercent,x,y,scale,rotateZ,borderRadius" });
      gsap.set(video, { objectPosition: OBJECT_POSITION_PANEL });
      gsap.set(copy, { opacity: 0 });
      gsap.set(panel2Copy, { opacity: 1, y: 0 });
      gsap.set([panel1Motion, panel3Motion], { clearProps: "xPercent,yPercent,x,y,scale,rotateZ" });
      stage.setAttribute("data-panels-ready", "true");

      function setupMobileCard(el: gsap.TweenTarget) {
        gsap.set(el, { opacity: 0, y: 24 });
        return ScrollTrigger.create({
          trigger: el as gsap.DOMTarget,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.3,
          onUpdate: (self) => {
            const p = self.progress;
            let y: number;
            let o: number;
            if (p < 0.12) {
              const t = p / 0.12;
              y = 24 * (1 - t);
              o = t;
            } else if (p > 0.85) {
              const t = (p - 0.85) / 0.15;
              y = -40 * t;
              o = 1 - 0.15 * t;
            } else {
              y = 0;
              o = 1;
            }
            gsap.set(el, { y, opacity: o });
          },
        });
      }

      const mobileTriggers = [panel1Motion, shell, panel3Motion].map(setupMobileCard);
      const unsubscribeMobile = subscribeFrame(() => ScrollTrigger.update());

      return () => {
        unsubscribeMobile();
        mobileTriggers.forEach((t) => t.kill());
        stage.removeAttribute("data-panels-ready");
      };
    }

    gsap.set(shell, {
      xPercent: -50,
      yPercent: -50,
      width: () => window.innerWidth,
      height: () => window.innerHeight,
      borderRadius: 0,
    });
    gsap.set(video, { objectPosition: OBJECT_POSITION_FULLSCREEN });
    gsap.set(panel2Copy, { opacity: 0, y: 12 });
    gsap.set(panel1Motion, { xPercent: -50, yPercent: -50, x: -70, y: 20, scale: 0.97, opacity: 0 });
    gsap.set(panel3Motion, { xPercent: -50, yPercent: -50, x: 70, y: 20, scale: 0.97, opacity: 0 });

    section.setAttribute("data-header-tone", "dark");
    let isDark = true;
    stage.setAttribute("data-panels-ready", "false");
    let panelsReady = false;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: stage,
        start: "top top",
        end: "+=300%",
        scrub: 0.4,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const nextDark = self.progress < HEADER_DARK_UNTIL;
          if (nextDark !== isDark) {
            isDark = nextDark;
            if (isDark) {
              section.setAttribute("data-header-tone", "dark");
            } else {
              section.removeAttribute("data-header-tone");
            }
            requestHeaderToneRefresh();
          }

          if (!panelsReady && self.progress >= PANELS_READY_ENTER) {
            panelsReady = true;
            stage.setAttribute("data-panels-ready", "true");
          } else if (panelsReady && self.progress < PANELS_READY_EXIT) {
            panelsReady = false;
            stage.setAttribute("data-panels-ready", "false");
          }
        },
      },
    });

    // 0 -> 0.15: pausa visual (vídeo a sangre, copy visible).
    tl.to(copy, { opacity: 0, duration: 0.15, ease: "power1.out" }, 0.15)
      .to(
        shell,
        {
          width: () => window.innerWidth * PANEL2_WIDTH_FRAC,
          height: () => window.innerHeight * PANEL2_HEIGHT_FRAC,
          borderRadius: PANEL_RADIUS,
          duration: 0.55,
          ease: "power2.inOut",
        },
        0.3,
      )
      .to(video, { objectPosition: OBJECT_POSITION_PANEL, duration: 0.55, ease: "power2.inOut" }, 0.3)
      .to(panel1Motion, { x: 0, y: 0, scale: 1, opacity: 1, duration: 0.2, ease: "power1.out" }, 0.68)
      .to(panel3Motion, { x: 0, y: 0, scale: 1, opacity: 1, duration: 0.2, ease: "power1.out" }, 0.68)
      .to(panel2Copy, { opacity: 1, y: 0, duration: 0.2, ease: "power1.out" }, 0.72);

    // Salida escalonada de izquierda a derecha (2026-07-28): sigue en la
    // MISMA timeline/ScrollTrigger, sin springs ni easing propio -- el
    // "efecto elástico" es puramente geométrico: cada panel sube en dos
    // fases (A = ascenso rápido con leve expansión, B = extensión suave
    // hacia el valor final), siempre con ease:"none" porque el scrub ya
    // hace de easing. El fondo/stickyStage no se tocan aquí -- solo los
    // wrappers exteriores de cada panel (los mismos nodos que ya anima la
    // entrada) y sus copys.
    const EXIT_SCALE_A = 1.012;
    const EXIT_OPACITY_A = 0.72;

    function addPanelExit(
      target: gsap.TweenTarget,
      startA: number,
      endA: number,
      endB: number,
      finalY: number,
      finalScale: number,
      finalRotateZ: number,
    ) {
      tl.to(target, { y: -92, scale: EXIT_SCALE_A, opacity: EXIT_OPACITY_A, duration: endA - startA, ease: "none" }, startA)
        .to(target, { y: finalY, scale: finalScale, opacity: 0, duration: endB - endA, ease: "none" }, endA)
        .to(target, { rotateZ: finalRotateZ, duration: endB - startA, ease: "none" }, startA);
    }

    function addCopyExit(target: gsap.TweenTarget, panelStartA: number, panelEndB: number) {
      const start = panelStartA + 0.045;
      const end = Math.min(panelEndB + 0.02, 0.999);
      tl.to(target, { y: -26, opacity: 0, duration: end - start, ease: "none" }, start);
    }

    // Panel 01 -- Valoración: 0.88 -> 0.94.
    addPanelExit(panel1Motion, 0.88, 0.905, 0.94, -125, 0.982, -0.22);
    addCopyExit(panel1Copy, 0.88, 0.94);

    // Panel 02 -- Marketing: 0.905 -> 0.97 (mismo tratamiento que 01/03,
    // sin volver a pantalla completa ni protagonismo especial).
    addPanelExit(shell, 0.905, 0.932, 0.97, -145, 0.97, 0.18);
    addCopyExit(panel2Copy, 0.905, 0.97);

    // Panel 03 -- Negociación: 0.93 -> 0.995.
    addPanelExit(panel3Motion, 0.93, 0.9565, 0.995, -130, 0.978, 0.28);
    addCopyExit(panel3Copy, 0.93, 0.995);

    const unsubscribe = subscribeFrame(() => ScrollTrigger.update());

    return () => {
      unsubscribe();
      tl.scrollTrigger?.kill();
      tl.kill();
      section.removeAttribute("data-header-tone");
      stage.removeAttribute("data-panels-ready");
    };
  }, []);

  return {
    sectionRef,
    stageRef,
    shellRef,
    videoRef,
    copyRef,
    panel2CopyRef,
    panel1MotionRef,
    panel1VideoRef,
    panel1CopyRef,
    panel3MotionRef,
    panel3VideoRef,
    panel3CopyRef,
  };
}
