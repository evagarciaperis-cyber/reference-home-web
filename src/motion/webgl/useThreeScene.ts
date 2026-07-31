"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { prefersReducedMotion } from "../core/media";
import { subscribeFrame } from "../core/frameTicker";

const DPR_MAX = 2;

export type ThreeFrameContext = {
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  renderer: THREE.WebGLRenderer;
  width: number;
  height: number;
};

type Options = {
  /** Se llama justo antes de cada renderer.render() mientras está activo -- aquí muta el consumidor su propia escena (posición, rotación, uniforms...). */
  onFrame?: (time: number, ctx: ThreeFrameContext) => void;
};

type Handle = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  sceneRef: React.RefObject<THREE.Scene | null>;
  cameraRef: React.RefObject<THREE.OrthographicCamera | null>;
  rendererRef: React.RefObject<THREE.WebGLRenderer | null>;
  /** true una vez el contexto WebGL se creó correctamente; false si WebGL no está disponible, falló la creación, o se perdió el contexto. */
  supported: boolean;
  /** true si el navegador pide prefers-reduced-motion -- el propio hook nunca decide por el consumidor, solo lo expone. */
  reducedMotion: boolean;
  /** Suscribe el render al ticker de frames existente. No-op si ya está activo o si !supported. */
  start: () => void;
  /** Desuscribe del ticker (deja de renderizar; no destruye recursos -- para eso, desmontar el componente). */
  stop: () => void;
};

/**
 * Base WebGL mínima y reutilizable (2026-08-19, primera integración de
 * Three.js en el proyecto -- sin sustituir todavía ningún efecto
 * existente, ver src/ui/debug/ThreeSceneTest.tsx para la prueba
 * aislada). Se encarga únicamente de infraestructura: WebGLRenderer
 * (alpha + antialias, devicePixelRatio limitado a 2), Scene,
 * OrthographicCamera (1 unidad = 1px del contenedor, recalculada en
 * cada resize), y limpieza completa al desmontar. No crea ninguna
 * geometría propia -- eso es cosa de quien use el hook, vía `onFrame` o
 * accediendo directamente a `sceneRef.current`.
 *
 * Render loop: NUNCA un requestAnimationFrame propio -- se engancha al
 * mismo `subscribeFrame` (src/motion/core/frameTicker.ts) que ya
 * conduce Lenis/ScrollTrigger/el resto de hooks de animación del
 * proyecto. Empieza DESUSCRITO (nada se renderiza hasta llamar a
 * `start()`); `stop()` desuscribe sin desmontar nada, para poder
 * activar/desactivar el render sin recrear la escena.
 *
 * Compatibilidad: si `new THREE.WebGLRenderer()` falla (WebGL no
 * disponible, contexto no se pudo crear) o si el contexto se pierde en
 * caliente (`webglcontextlost`), `supported` pasa a `false` y el render
 * se detiene -- nunca lanza, nunca bloquea la página; el fallback visual
 * (qué mostrar en su lugar) es responsabilidad del consumidor, este hook
 * solo informa del estado. `reducedMotion` se expone igual, sin decidir
 * nada por su cuenta -- cada escena decide qué hacer con esa señal (aquí,
 * la de prueba, para no rotar).
 *
 * Limpieza al desmontar: stop() (desuscribe el ticker) + ResizeObserver.
 * disconnect() + listeners de contexto WebGL retirados + recorrido de la
 * escena disponiendo geometry/material/texture de cualquier objeto que
 * el consumidor no haya limpiado ya por su cuenta (red de seguridad,
 * además de lo que cada consumidor deba disponer explícitamente) +
 * renderer.dispose() + canvas retirado del DOM. Sin
 * forceContextLoss() -- no está justificado en un desmontaje normal.
 */
export function useThreeScene(options?: Options): Handle {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const onFrameRef = useRef(options?.onFrame);
  onFrameRef.current = options?.onFrame;

  const [supported, setSupported] = useState(false);
  const [reducedMotion] = useState(() => (typeof window === "undefined" ? false : prefersReducedMotion()));

  const start = () => {
    if (unsubscribeRef.current) return;
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
    unsubscribeRef.current = subscribeFrame((time) => {
      const renderer = rendererRef.current;
      const scene = sceneRef.current;
      const camera = cameraRef.current;
      if (!renderer || !scene || !camera) return;
      const size = renderer.getSize(new THREE.Vector2());
      onFrameRef.current?.(time, { scene, camera, renderer, width: size.x, height: size.y });
      renderer.render(scene, camera);
    });
  };

  const stop = () => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      setSupported(false);
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(0, 0, 0, 0, 0.1, 100);
    camera.position.z = 10;

    const applySize = (width: number, height: number) => {
      const w = Math.max(1, width);
      const h = Math.max(1, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DPR_MAX));
      renderer.setSize(w, h, false);
      camera.left = -w / 2;
      camera.right = w / 2;
      camera.top = h / 2;
      camera.bottom = -h / 2;
      camera.updateProjectionMatrix();
    };

    const rect = container.getBoundingClientRect();
    applySize(rect.width, rect.height);

    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    container.appendChild(renderer.domElement);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    setSupported(true);

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      applySize(entry.contentRect.width, entry.contentRect.height);
    });
    resizeObserver.observe(container);

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      stop();
      setSupported(false);
    };
    // Restauración completa (recrear buffers/recursos) queda fuera de
    // esta base mínima a propósito -- de momento solo evita que se siga
    // intentando renderizar sobre un contexto muerto.
    renderer.domElement.addEventListener("webglcontextlost", handleContextLost);

    return () => {
      stop();
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("webglcontextlost", handleContextLost);

      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry?.dispose();
          const material = object.material;
          const materials = Array.isArray(material) ? material : [material];
          materials.forEach((mat) => {
            Object.values(mat).forEach((value) => {
              if (value instanceof THREE.Texture) value.dispose();
            });
            mat.dispose();
          });
        }
      });

      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }

      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
    };
  }, []);

  return { containerRef, sceneRef, cameraRef, rendererRef, supported, reducedMotion, start, stop };
}
