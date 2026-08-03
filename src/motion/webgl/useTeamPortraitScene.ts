"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useThreeScene } from "./useThreeScene";
import { portraitVertexShader, portraitFragmentShader } from "./teamPortraitShaders";

const PARALLAX_LERP = 0.08;

// THREE.Texture.image está tipado como unknown (puede ser HTMLImageElement,
// HTMLCanvasElement, ImageBitmap...) -- aquí siempre es HTMLImageElement
// (TextureLoader), de ahí el cast puntual en este único punto.
function textureSize(tex: THREE.Texture): { width: number; height: number } {
  const image = tex.image as HTMLImageElement;
  return { width: image.width, height: image.height };
}

type Handle = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  supported: boolean;
  reducedMotion: boolean;
  start: () => void;
  stop: () => void;
  /** Marca qué textura va en cada canal y el crossfade entre ambas (0 = solo a, 1 = solo b). Carga bajo demanda (ver comentario del hook). */
  setActive: (indexA: number, indexB: number, mix: number) => void;
  /** 1 = nítido/en reposo, 0 = mitad de una transición (dispara el desenfoque muy controlado del shader). */
  setFocus: (value: number) => void;
  /** Objetivo de paralaje por cursor, en unidades normalizadas (-1..1); el hook aplica su propia inercia hacia este valor, nunca lo salta. */
  setParallaxTarget: (x: number, y: number) => void;
};

/**
 * Escena Three.js del bloque "Nuestro equipo" (2026-08-21) -- construida
 * sobre useThreeScene.ts (misma base que TestSection: WebGLRenderer +
 * OrthographicCamera 1 unidad = 1px, render enganchado al frameTicker
 * compartido, nunca un rAF propio). Un único plano a pantalla completa
 * DEL CONTENEDOR (el "stage" del retrato dentro de WorkZoom.tsx, no toda
 * la sección) con un ShaderMaterial que hace crossfade entre dos
 * retratos (teamPortraitShaders.ts) -- ver ese archivo para el
 * mapeo cover/paralaje/profundidad aproximada/desenfoque.
 *
 * Carga de texturas perezosa/progresiva: no se cargan las 6 imágenes de
 * golpe al montar -- solo cuando `setActive` referencia un índice por
 * primera vez (la persona activa, y la siguiente para que su transición
 * ya tenga la textura lista). Mientras una textura real no ha cargado
 * (o si el archivo no existe -- ver WorkZoom.tsx, ninguno de los 6
 * retratos provisionales existe todavía) se usa una textura de reserva
 * compartida, cargada una sola vez.
 *
 * useTeamExperience.ts es quien decide QUÉ mostrar cuadro a cuadro
 * (según el progreso del scroll) y llama a setActive/setFocus -- este
 * hook no sabe nada de GSAP ni de ScrollTrigger, solo dibuja lo que se
 * le pide, igual que useThreeScene no sabe nada de TestSection.
 */
export function useTeamPortraitScene(imageSources: string[], fallbackSrc: string): Handle {
  const { containerRef, sceneRef, supported, reducedMotion, start, stop } = useThreeScene({
    onFrame: (_time, ctx) => {
      const mesh = meshRef.current;
      if (!mesh) return;
      mesh.scale.set(ctx.width, ctx.height, 1);
      const material = mesh.material as THREE.ShaderMaterial;
      material.uniforms.uResolution.value.set(ctx.width, ctx.height);

      // Inercia del paralaje -- nunca salta al valor objetivo, siempre
      // se acerca un poco cada frame (mismo criterio de "respuesta con
      // inercia" pedido para el cursor).
      const current = parallaxCurrentRef.current;
      const target = parallaxTargetRef.current;
      current.x += (target.x - current.x) * PARALLAX_LERP;
      current.y += (target.y - current.y) * PARALLAX_LERP;
      material.uniforms.uParallax.value.set(current.x, current.y);
    },
  });

  const meshRef = useRef<THREE.Mesh | null>(null);
  const texturesRef = useRef<(THREE.Texture | null)[]>(new Array(imageSources.length).fill(null));
  const loadingRef = useRef<boolean[]>(new Array(imageSources.length).fill(false));
  const fallbackTextureRef = useRef<THREE.Texture | null>(null);
  const activeIndicesRef = useRef({ a: -1, b: -1 });
  const parallaxTargetRef = useRef({ x: 0, y: 0 });
  const parallaxCurrentRef = useRef({ x: 0, y: 0 });
  const loaderRef = useRef<THREE.TextureLoader | null>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const loader = new THREE.TextureLoader();
    loaderRef.current = loader;

    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.ShaderMaterial({
      vertexShader: portraitVertexShader,
      fragmentShader: portraitFragmentShader,
      uniforms: {
        uTexA: { value: null },
        uTexB: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uImageResolutionA: { value: new THREE.Vector2(1, 1) },
        uImageResolutionB: { value: new THREE.Vector2(1, 1) },
        uMix: { value: 0 },
        uFocus: { value: 1 },
        uParallax: { value: new THREE.Vector2(0, 0) },
      },
      transparent: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    meshRef.current = mesh;

    // Textura de reserva -- se usa para CUALQUIER retrato mientras su
    // textura real no ha cargado (o si nunca llega a existir). Cargada
    // una vez, compartida por los 6 índices.
    loader.load(fallbackSrc, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      fallbackTextureRef.current = tex;
      const { width, height } = textureSize(tex);
      if (!material.uniforms.uTexA.value) {
        material.uniforms.uTexA.value = tex;
        material.uniforms.uImageResolutionA.value.set(width, height);
      }
      if (!material.uniforms.uTexB.value) {
        material.uniforms.uTexB.value = tex;
        material.uniforms.uImageResolutionB.value.set(width, height);
      }
    });

    return () => {
      scene.remove(mesh);
      geometry.dispose();
      material.dispose();
      texturesRef.current.forEach((tex) => tex?.dispose());
      texturesRef.current = new Array(imageSources.length).fill(null);
      fallbackTextureRef.current?.dispose();
      fallbackTextureRef.current = null;
      meshRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ensureTextureRequested = (index: number) => {
    if (index < 0 || index >= imageSources.length) return;
    if (texturesRef.current[index] || loadingRef.current[index]) return;
    const loader = loaderRef.current;
    if (!loader) return;
    loadingRef.current[index] = true;
    loader.load(
      imageSources[index],
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        texturesRef.current[index] = tex;
      },
      undefined,
      () => {
        // 404 u otro error de carga -- el índice se queda en null, así
        // que textureFor() sigue devolviendo la reserva indefinidamente
        // (no se reintenta: es el caso esperado hasta que se añadan los
        // retratos reales, ver WorkZoom.tsx).
        loadingRef.current[index] = false;
      },
    );
  };

  const textureFor = (index: number): { texture: THREE.Texture | null; width: number; height: number } => {
    const real = texturesRef.current[index];
    if (real) return { texture: real, ...textureSize(real) };
    const fallback = fallbackTextureRef.current;
    if (fallback) return { texture: fallback, ...textureSize(fallback) };
    return { texture: null, width: 1, height: 1 };
  };

  const setActive: Handle["setActive"] = (indexA, indexB, mix) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const material = mesh.material as THREE.ShaderMaterial;

    ensureTextureRequested(indexA);
    ensureTextureRequested(indexB);

    if (activeIndicesRef.current.a !== indexA) {
      const { texture, width, height } = textureFor(indexA);
      if (texture) {
        material.uniforms.uTexA.value = texture;
        material.uniforms.uImageResolutionA.value.set(width, height);
      }
      activeIndicesRef.current.a = indexA;
    }
    if (activeIndicesRef.current.b !== indexB) {
      const { texture, width, height } = textureFor(indexB);
      if (texture) {
        material.uniforms.uTexB.value = texture;
        material.uniforms.uImageResolutionB.value.set(width, height);
      }
      activeIndicesRef.current.b = indexB;
    }

    // La textura real puede haber terminado de cargar DESPUÉS de fijar
    // los índices de arriba -- se reintenta cada llamada (barata: solo
    // compara referencias) hasta que deje de ser la de reserva.
    if (texturesRef.current[indexA] && material.uniforms.uTexA.value !== texturesRef.current[indexA]) {
      const tex = texturesRef.current[indexA]!;
      material.uniforms.uTexA.value = tex;
      const { width, height } = textureSize(tex);
      material.uniforms.uImageResolutionA.value.set(width, height);
    }
    if (texturesRef.current[indexB] && material.uniforms.uTexB.value !== texturesRef.current[indexB]) {
      const tex = texturesRef.current[indexB]!;
      material.uniforms.uTexB.value = tex;
      const { width, height } = textureSize(tex);
      material.uniforms.uImageResolutionB.value.set(width, height);
    }

    material.uniforms.uMix.value = mix;
  };

  const setFocus: Handle["setFocus"] = (value) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    (mesh.material as THREE.ShaderMaterial).uniforms.uFocus.value = value;
  };

  const setParallaxTarget: Handle["setParallaxTarget"] = (x, y) => {
    parallaxTargetRef.current.x = x;
    parallaxTargetRef.current.y = y;
  };

  return { containerRef, supported, reducedMotion, start, stop, setActive, setFocus, setParallaxTarget };
}
