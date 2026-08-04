"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useThreeScene } from "./useThreeScene";
import { quadVertexShader, trailFragmentShader, compositeFragmentShader } from "./testSectionFluidShaders";
import { DESKTOP_QUERY } from "../core/media";
import { subscribeFrame } from "../core/frameTicker";

const IMAGE_SRC = "/images/valoracion/reveal-valoracion.png";

// 2026-08-20: subido de 0.5 a 0.65 -- a la resolución anterior, el
// upscale bilineal al componer sumaba un halo extra sobre un borde que
// ya era demasiado suave (ver REVEAL_STRENGTH). Sigue siendo mitad-ish
// de la resolución real por rendimiento, no resolución completa.
const MASK_SCALE = 0.65; // resolución del render target de la estela
const LERP = 0.19; // 0.16-0.22: cuánto se acerca la posición eased al cursor real cada frame -- sensación directa
const SPEED_NORM = 1.2; // px/ms de la posición eased al que la "intensidad" satura a 1

// R es la escala general de la silueta de 5 masas fundidas del shader
// (ver testSectionFluidShaders.ts), no el radio de un círculo.
// 2026-08-20: reducido ~23% (168->130 en reposo, 213->165 en
// movimiento) -- la mancha se sentía demasiado grande/invasiva.
const CORE_RADIUS = 130; // px (espacio de sección, sin escalar todavía por MASK_SCALE)
const SIZE_BOOST = 35; // se añade a R según la intensidad de velocidad

// Radios representativos de las 3 categorías de microgotas (px reales,
// se escalan por MASK_SCALE una sola vez al crear el material -- ver
// más abajo). Cada categoría tiene además una variación interna (ver
// shader) para que no todas las gotas de un mismo tamaño se vean
// idénticas.
const DROP_RADIUS_SMALL = 16; // 14-18px
const DROP_RADIUS_MEDIUM = 26; // 22-30px
const DROP_RADIUS_LARGE = 40; // 34-46px

const FADE_ALPHA_IDLE = 0.13; // decaimiento rápido -- estela corta en movimientos lentos (~350ms)
const FADE_ALPHA_FAST = 0.055; // decaimiento lento -- estela más larga con el cursor rápido (~600ms)

const LINGER_MS = 700; // tras el último movimiento/salida, cuánto se sigue "tickeando" para dejar disipar
// 2026-08-20: banda de transición del smoothstep final -- antes 0.36
// (un rango de umbral amplio, la causa principal del aspecto lechoso/
// vaporoso reportado). Ahora una franja mínima, solo para suavizar el
// aliasing técnico del recorte, no un halo visible. Comparte valor con
// la máscara CSS del texto (mismo cálculo, ver updateCssTextMask) --
// cambiarlo aquí mantiene ambas consistentes.
const REVEAL_STRENGTH = 0.05;

// 2026-08-20: la máscara CSS del texto blanco se actualiza cada N frames
// (no cada frame) -- leer píxeles de un render target de vuelta a la CPU
// (readRenderTargetPixels) fuerza una sincronización GPU/CPU, y
// codificar el canvas auxiliar a PNG (toDataURL) tampoco es gratis.
// Suficientemente frecuente (~20fps a 60fps de ticker) para que el
// recorte del texto siga a la mancha sin percibirse a saltos.
const CSS_MASK_THROTTLE = 3;

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);
const smoothstepJS = (edge0: number, edge1: number, x: number) => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

type Refs = {
  sectionRef: React.RefObject<HTMLElement | null>;
  canvasHostRef: React.RefObject<HTMLDivElement | null>;
  whiteLayerRef: React.RefObject<HTMLDivElement | null>;
  mobileRevealRef: React.RefObject<HTMLDivElement | null>;
  supported: boolean;
  onPointerEnter: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerLeave: (event: React.PointerEvent<HTMLElement>) => void;
};

type Resources = {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  trailScene: THREE.Scene;
  trailCamera: THREE.OrthographicCamera;
  trailMesh: THREE.Mesh;
  trailMaterial: THREE.ShaderMaterial;
  rtA: THREE.WebGLRenderTarget;
  rtB: THREE.WebGLRenderTarget;
  reading: THREE.WebGLRenderTarget;
  writing: THREE.WebGLRenderTarget;
  imageTexture: THREE.Texture;
  maskCanvas: HTMLCanvasElement;
  maskCtx: CanvasRenderingContext2D;
  maskImageData: ImageData;
  pixelBuffer: Uint8Array;
  maskSize: { w: number; h: number };
};

/**
 * Primera integración visual real de Three.js (2026-08-19) -- revelación
 * orgánica de la fotografía oculta en TestSection, con estela y
 * disipación, sobre la base de useThreeScene.ts. Sustituye la versión de
 * Canvas 2D (useTestSectionCanvasReveal.ts, que queda sin usar en disco).
 *
 * DOS PASADAS POR FRAME (ver testSectionFluidShaders.ts):
 *  1. Trail (render target, ping-pong): decae el frame anterior y, si
 *     hay actividad, funde 5 masas SDF (cabeza, cuerpo, cola, lóbulo
 *     lateral, microprotuberancia -- smooth-min, nunca círculos con
 *     alpha sumado) en una única silueta biomórfica orientada según la
 *     dirección de movimiento, más hasta 4 microgotas deterministas (3
 *     categorías de tamaño real) naciendo desde la cola/lóbulo lateral.
 *     Sin núcleo radial único.
 *     Con el cursor quieto, un "idle morph" hace respirar/derivar cada
 *     masa (senos de baja frecuencia, se atenúa solo en cuanto hay
 *     movimiento real) -- la mancha nunca queda congelada en reposo.
 *  2. Composite (a pantalla, dentro de la escena de useThreeScene): un
 *     único plano a tamaño de la sección mezcla la fotografía (object-fit
 *     cover replicado en el shader) con el blanco -- alpha = la estela,
 *     así que fuera de la mancha el canvas es TRANSPARENTE de verdad y
 *     se ve el fondo blanco real del DOM.
 *
 * TEXTO (2026-08-20, reescrito por completo): la versión anterior
 * pintaba el texto blanco DENTRO del canvas (una textura Canvas 2D que
 * medía el DOM con getBoundingClientRect/getComputedStyle e intentaba
 * replicar la tipografía a mano) -- las métricas nunca coincidían
 * exactamente con el texto HTML real (kerning, cursiva, saltos de línea),
 * así que las dos copias se veían desalineadas. Ahora NO se renderiza
 * ninguna tipografía en WebGL/Canvas2D: hay dos capas HTML del MISMO
 * componente (TestSectionCopy, en TestSection.tsx) -- una negra normal y
 * una blanca recortada con `mask-image` CSS. Esa máscara se genera leyendo
 * de vuelta (`renderer.readRenderTargetPixels`) el MISMO render target
 * que ya alimenta la fotografía, dibujándolo en escala de grises sobre un
 * canvas 2D auxiliar (nunca en el DOM) y volcándolo como
 * `mask-image: url(dataURL)` sobre la capa blanca -- la fuente de verdad
 * de "qué está revelado" es una sola en todo momento (el mismo
 * framebuffer), así que la mancha, la foto y el recorte del texto nunca
 * pueden desincronizarse entre sí. Throttled a CSS_MASK_THROTTLE frames
 * (el readback no es gratis); la fotografía sigue actualizándose cada
 * frame sin throttle.
 *
 * Interacción: pointerenter/move/leave sobre la propia `<section>`
 * (sectionRef). Posición eased con lerp simple, velocidad = delta de la
 * posición eased, intensidad controla tamaño/decaimiento. `start()`/
 * `stop()` (de useThreeScene) mantienen el render suscrito al ticker
 * solo mientras hay actividad real o estela por disipar (LINGER_MS) --
 * nunca un rAF propio.
 *
 * Fallback: si `!supported` (WebGL no disponible/falló/contexto
 * perdido), `reducedMotion`, o el dispositivo no tiene cursor real
 * (`hover:none`/touch), no se construye nada -- la sección se queda en
 * blanco + texto (negro) estático, sin que este hook intervenga.
 */
export function useTestSectionFluidReveal(): Refs {
  const sectionRef = useRef<HTMLElement>(null);
  const whiteLayerRef = useRef<HTMLDivElement>(null);
  const mobileRevealRef = useRef<HTMLDivElement>(null);

  const targetRef = useRef({ x: 0, y: 0 });
  const easedRef = useRef({ x: 0, y: 0, lastX: 0, lastY: 0 });
  const addingRef = useRef(false);
  const activeUntilRef = useRef(0);
  const lastSizeRef = useRef({ w: 0, h: 0 });
  const maskFrameCountRef = useRef(0);

  const resourcesRef = useRef<Resources | null>(null);

  const eligible = () =>
    typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  // Vuelca el render target de la estela (el mismo que ya usa la foto)
  // sobre la máscara CSS de la capa de texto blanca -- misma fuente,
  // nunca puede desalinearse con la revelación de la fotografía.
  const updateCssTextMask = (renderer: THREE.WebGLRenderer) => {
    const resources = resourcesRef.current;
    const whiteLayer = whiteLayerRef.current;
    if (!resources || !whiteLayer) return;

    const { w, h } = resources.maskSize;
    renderer.readRenderTargetPixels(resources.writing, 0, 0, w, h, resources.pixelBuffer);

    const src = resources.pixelBuffer;
    const dst = resources.maskImageData.data;
    for (let y = 0; y < h; y += 1) {
      // readRenderTargetPixels devuelve las filas en orden GL (fila 0 =
      // parte INFERIOR); ImageData/canvas 2D esperan fila 0 = superior.
      const srcRow = h - 1 - y;
      for (let x = 0; x < w; x += 1) {
        const srcI = (srcRow * w + x) * 4;
        const dstI = (y * w + x) * 4;
        const raw = src[srcI] / 255;
        // Mismo smoothstep que usa compositeFragmentShader para el
        // borde de la fotografía -- el recorte del texto usa el umbral
        // idéntico, no uno aproximado a mano.
        const v = Math.round(smoothstepJS(0.16, 0.16 + REVEAL_STRENGTH, raw) * 255);
        dst[dstI] = v;
        dst[dstI + 1] = v;
        dst[dstI + 2] = v;
        dst[dstI + 3] = 255;
      }
    }

    resources.maskCtx.putImageData(resources.maskImageData, 0, 0);
    const url = `url(${resources.maskCanvas.toDataURL()})`;
    whiteLayer.style.maskImage = url;
    whiteLayer.style.webkitMaskImage = url;
  };

  const handleResize = (width: number, height: number, renderer: THREE.WebGLRenderer) => {
    const resources = resourcesRef.current;
    if (!resources) return;

    resources.mesh.scale.set(width, height, 1);
    resources.material.uniforms.uResolution.value.set(width, height);

    const trailW = Math.max(1, Math.round(width * MASK_SCALE));
    const trailH = Math.max(1, Math.round(height * MASK_SCALE));
    resources.rtA.setSize(trailW, trailH);
    resources.rtB.setSize(trailW, trailH);
    resources.trailMaterial.uniforms.uResolution.value.set(trailW, trailH);

    resources.maskCanvas.width = trailW;
    resources.maskCanvas.height = trailH;
    resources.maskImageData = resources.maskCtx.createImageData(trailW, trailH);
    resources.pixelBuffer = new Uint8Array(trailW * trailH * 4);
    resources.maskSize = { w: trailW, h: trailH };

    renderer.setRenderTarget(resources.rtA);
    renderer.clear();
    renderer.setRenderTarget(resources.rtB);
    renderer.clear();
    renderer.setRenderTarget(null);

    // Limpia el mask-image inline (no "none", que dejaría la capa blanca
    // completamente VISIBLE) -- vuelve al valor por defecto de
    // .textLayerWhite en el CSS (invisible), hasta que el próximo
    // updateCssTextMask fije uno real ya con el tamaño nuevo.
    const whiteLayer = whiteLayerRef.current;
    if (whiteLayer) {
      whiteLayer.style.maskImage = "";
      whiteLayer.style.webkitMaskImage = "";
    }
  };

  const { containerRef, sceneRef, rendererRef, supported, reducedMotion, start, stop } = useThreeScene({
    onFrame: (time, { scene, renderer, width, height }) => {
      const resources = resourcesRef.current;
      if (!resources) return;

      if (width !== lastSizeRef.current.w || height !== lastSizeRef.current.h) {
        lastSizeRef.current = { w: width, h: height };
        handleResize(width, height, renderer);
      }

      const eased = easedRef.current;
      const target = targetRef.current;
      eased.lastX = eased.x;
      eased.lastY = eased.y;
      eased.x += (target.x - eased.x) * LERP;
      eased.y += (target.y - eased.y) * LERP;

      const dx = eased.x - eased.lastX;
      const dy = eased.y - eased.lastY;
      const moved = Math.abs(dx) + Math.abs(dy);
      const speed = Math.sqrt(dx * dx + dy * dy);
      const intensity = clamp(speed / SPEED_NORM, 0, 1);
      const dir = moved > 0.02 ? { x: dx, y: dy } : { x: 1, y: 0 };
      const fadeAlpha = FADE_ALPHA_IDLE - intensity * (FADE_ALPHA_IDLE - FADE_ALPHA_FAST);

      const scale = MASK_SCALE;
      const tUniforms = resources.trailMaterial.uniforms;
      tUniforms.uPrevTrail.value = resources.reading.texture;
      tUniforms.uMouse.value.set(eased.x * scale, eased.y * scale);
      tUniforms.uLobeDir.value.set(dir.x, dir.y);
      tUniforms.uIntensity.value = intensity;
      tUniforms.uAdding.value = addingRef.current ? 1 : 0;
      tUniforms.uDecay.value = 1 - fadeAlpha;
      tUniforms.uTime.value = time * 0.001;
      tUniforms.uCoreRadius.value = (CORE_RADIUS + intensity * SIZE_BOOST) * scale;

      renderer.setRenderTarget(resources.writing);
      renderer.render(resources.trailScene, resources.trailCamera);
      renderer.setRenderTarget(null);

      resources.material.uniforms.uTrail.value = resources.writing.texture;

      maskFrameCountRef.current += 1;
      if (maskFrameCountRef.current >= CSS_MASK_THROTTLE) {
        maskFrameCountRef.current = 0;
        updateCssTextMask(renderer);
      }

      const nextReading = resources.writing;
      resources.writing = resources.reading;
      resources.reading = nextReading;

      if (!addingRef.current && time > activeUntilRef.current) {
        stop();
      }

      void scene;
    },
  });

  useEffect(() => {
    if (!supported || reducedMotion || !eligible()) return;

    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const section = sectionRef.current;
    if (!renderer || !scene || !section) return;

    renderer.setClearColor(0x000000, 0);

    const rect = section.getBoundingClientRect();
    const trailW = Math.max(1, Math.round(rect.width * MASK_SCALE));
    const trailH = Math.max(1, Math.round(rect.height * MASK_SCALE));

    const rtOptions: THREE.RenderTargetOptions = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: false,
      stencilBuffer: false,
    };
    const rtA = new THREE.WebGLRenderTarget(trailW, trailH, rtOptions);
    const rtB = new THREE.WebGLRenderTarget(trailW, trailH, rtOptions);

    const trailMaterial = new THREE.ShaderMaterial({
      vertexShader: quadVertexShader,
      fragmentShader: trailFragmentShader,
      uniforms: {
        uPrevTrail: { value: rtA.texture },
        uResolution: { value: new THREE.Vector2(trailW, trailH) },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uLobeDir: { value: new THREE.Vector2(1, 0) },
        uIntensity: { value: 0 },
        uAdding: { value: 0 },
        uDecay: { value: 0.87 },
        uTime: { value: 0 },
        uCoreRadius: { value: CORE_RADIUS * MASK_SCALE },
        // Estático -- no cambia por frame, se calcula una vez aquí.
        uDropSizes: {
          value: new THREE.Vector3(
            DROP_RADIUS_SMALL * MASK_SCALE,
            DROP_RADIUS_MEDIUM * MASK_SCALE,
            DROP_RADIUS_LARGE * MASK_SCALE,
          ),
        },
      },
    });
    const trailScene = new THREE.Scene();
    const trailCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    trailCamera.position.z = 1;
    const trailMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), trailMaterial);
    trailScene.add(trailMesh);

    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = trailW;
    maskCanvas.height = trailH;
    const maskCtx = maskCanvas.getContext("2d");
    if (!maskCtx) return; // sin contexto 2D -- no debería ocurrir si WebGL ya funciona, pero por seguridad

    const imageTexture = new THREE.TextureLoader().load(IMAGE_SRC, (tex) => {
      const material = resourcesRef.current?.material;
      if (material) {
        material.uniforms.uImageResolution.value.set(tex.image.width, tex.image.height);
      }
    });

    const material = new THREE.ShaderMaterial({
      vertexShader: quadVertexShader,
      fragmentShader: compositeFragmentShader,
      transparent: true,
      uniforms: {
        uImage: { value: imageTexture },
        uTrail: { value: rtA.texture },
        uResolution: { value: new THREE.Vector2(rect.width, rect.height) },
        uImageResolution: { value: new THREE.Vector2(1, 1) },
        uRevealStrength: { value: REVEAL_STRENGTH },
      },
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    mesh.scale.set(rect.width, rect.height, 1);
    scene.add(mesh);

    resourcesRef.current = {
      mesh,
      material,
      trailScene,
      trailCamera,
      trailMesh,
      trailMaterial,
      rtA,
      rtB,
      reading: rtA,
      writing: rtB,
      imageTexture,
      maskCanvas,
      maskCtx,
      maskImageData: maskCtx.createImageData(trailW, trailH),
      pixelBuffer: new Uint8Array(trailW * trailH * 4),
      maskSize: { w: trailW, h: trailH },
    };

    lastSizeRef.current = { w: 0, h: 0 }; // fuerza un handleResize en el primer onFrame
    maskFrameCountRef.current = 0;

    return () => {
      const resources = resourcesRef.current;
      resourcesRef.current = null;
      if (!resources) return;

      scene.remove(resources.mesh);
      resources.mesh.geometry.dispose();
      resources.material.dispose();
      resources.trailScene.remove(resources.trailMesh);
      resources.trailMesh.geometry.dispose();
      resources.trailMaterial.dispose();
      resources.rtA.dispose();
      resources.rtB.dispose();
      resources.imageTexture.dispose();

      // Limpia el mask-image inline (no "none") -- vuelve al valor por
      // defecto invisible de .textLayerWhite en vez de dejarla visible.
      const whiteLayer = whiteLayerRef.current;
      if (whiteLayer) {
        whiteLayer.style.maskImage = "";
        whiteLayer.style.webkitMaskImage = "";
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported, reducedMotion]);

  /**
   * Revelado móvil (≤900px, DESKTOP_QUERY de motion/core/media.ts -- el
   * breakpoint maestro del proyecto). Completamente independiente del
   * efecto de arriba: nunca se ejecutan los dos a la vez (uno u otro
   * según el ancho), y este no toca WebGL/Three.js en absoluto -- es la
   * razón técnica de que la interacción de cursor no tenga sentido aquí
   * (no hay hover ni puntero continuo), así que en vez de intentar
   * simularla se sustituye por un mecanismo de naturaleza distinta: una
   * capa burdeos plana (.mobileReveal, TestSection.module.css) recortada
   * con clip-path, cuyo avance depende del scroll natural -- sin pin
   * propio, sin scroll-jacking, sin simular ningún cursor.
   *
   * REFERENCIA DE SCROLL (el punto no evidente de esta implementación):
   * en la Home actual, TestSection vive anidado dentro de la escena de
   * BuyerExperience (telón + vídeo que se abre por el centro vía
   * clip-path, useBuyerExperience.ts) -- su .sticky mantiene a
   * TestSection fija ocupando el viewport (position:absolute dentro de
   * ese sticky) durante TODA esa escena, en cualquier ancho (ese hook no
   * tiene rama de escritorio/móvil, solo ajusta una duración). Medir el
   * progreso sobre section.getBoundingClientRect() aquí se queda
   * CONGELADO (top:0 constante) en cuanto ese sticky engancha, mucho
   * antes de que el vídeo termine de abrirse -- el revelado terminaría
   * invisible, oculto detrás del vídeo todavía cerrado. La sección
   * exterior (`.buyer`, NUNCA sticky ella misma, solo su hijo) sí tiene
   * una posición que avanza sin congelarse durante todo el scroll, así
   * que se referencia A ELLA en vez de a la propia sección -- solo
   * LECTURA de su geometría, sin importar ni tocar useBuyerExperience.ts/
   * BuyerExperience.tsx/module.css. Con fallback a la propia sección si
   * algún día se usa TestSection sin ese ancestro.
   *
   * REVEAL_START/END (0.90-0.99) son una ventana dentro de ese mismo
   * progreso 0-1 exterior ("top bottom" a "bottom bottom", igual
   * definición que usa el propio ScrollTrigger de useBuyerExperience.ts
   * por construcción geométrica) -- caen DESPUÉS de que el vídeo termina
   * de abrirse (~0.88 con la duración actual de esa escena) y ANTES de
   * que termine su pausa de lectura (1.0), verificado visualmente. Si la
   * duración de esa escena cambia en el futuro, este es el primer sitio
   * a revisar -- es la única dependencia real entre ambas escenas, y es
   * de lectura, nunca de escritura.
   *
   * Sin rAF propio: se suscribe a subscribeFrame (motion/core/frameTicker.ts),
   * el mismo ticker que ya conduce Lenis y el resto de hooks de motion del
   * proyecto -- lee la posición vía getBoundingClientRect en cada frame
   * (sin listener de "scroll" propio) y escribe un único clip-path
   * inline, igual de barato que leer/escribir un estilo por frame en
   * cualquier otro hook de scroll del proyecto.
   */
  useEffect(() => {
    const section = sectionRef.current;
    const reveal = mobileRevealRef.current;
    if (!section || !reveal) return;
    if (reducedMotion) return;
    if (window.matchMedia(DESKTOP_QUERY).matches) return;

    const outerScrollHost = section.parentElement?.closest("section") ?? section;
    const REVEAL_START = 0.9;
    const REVEAL_END = 0.97;

    const render = () => {
      const rect = outerScrollHost.getBoundingClientRect();
      const vh = window.innerHeight;
      // (vh - rect.top) / rect.height -- NO "+ vh" en el denominador: debe
      // reproducir exactamente "top bottom" -> "bottom bottom" (self.progress
      // de useBuyerExperience.ts), no "top bottom" -> "bottom top". Con un
      // contenedor más alto que el viewport (aquí siempre lo es, 352vh),
      // "bottom bottom" cae en rect.top = vh - rect.height, no en
      // rect.top = -rect.height -- de ahí que el divisor correcto sea solo
      // rect.height. Verificado numéricamente contra el propio release del
      // sticky exterior antes de fijar este valor.
      const outerProgress = clamp((vh - rect.top) / rect.height, 0, 1);
      const progress = clamp((outerProgress - REVEAL_START) / (REVEAL_END - REVEAL_START), 0, 1);
      const topInset = ((1 - progress) * 100).toFixed(2);
      reveal.style.clipPath = `inset(${topInset}% 0 0 0)`;
    };

    render();
    const unsubscribe = subscribeFrame(render);
    return () => {
      unsubscribe();
      reveal.style.clipPath = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  const updateTarget = (event: React.PointerEvent<HTMLElement>) => {
    const section = sectionRef.current;
    if (!section) return;
    const rect = section.getBoundingClientRect();
    const x = event.clientX - rect.left;
    // DOM (origen arriba-izquierda, Y crece hacia abajo) -> GL (origen
    // abajo-izquierda, Y crece hacia arriba) -- ver nota histórica en
    // versiones anteriores de este archivo; el shader nunca toca el eje Y.
    const y = rect.height - (event.clientY - rect.top);
    targetRef.current = { x, y };
  };

  const shouldSkip = (event: React.PointerEvent<HTMLElement>) =>
    event.pointerType === "touch" || reducedMotion || !supported || !resourcesRef.current;

  const onPointerEnter = (event: React.PointerEvent<HTMLElement>) => {
    if (shouldSkip(event)) return;
    updateTarget(event);
    easedRef.current.x = targetRef.current.x;
    easedRef.current.y = targetRef.current.y;
    easedRef.current.lastX = targetRef.current.x;
    easedRef.current.lastY = targetRef.current.y;
    addingRef.current = true;
    activeUntilRef.current = performance.now() + LINGER_MS;
    start();
  };

  const onPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (shouldSkip(event)) return;
    updateTarget(event);
    addingRef.current = true;
    activeUntilRef.current = performance.now() + LINGER_MS;
    start();
  };

  const onPointerLeave = (event: React.PointerEvent<HTMLElement>) => {
    if (shouldSkip(event)) return;
    addingRef.current = false;
  };

  return {
    sectionRef,
    canvasHostRef: containerRef,
    whiteLayerRef,
    mobileRevealRef,
    supported: supported && !reducedMotion && eligible(),
    onPointerEnter,
    onPointerMove,
    onPointerLeave,
  };
}
