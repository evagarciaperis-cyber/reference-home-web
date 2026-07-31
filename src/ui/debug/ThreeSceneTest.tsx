"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useThreeScene } from "@/motion/webgl/useThreeScene";
import styles from "./ThreeSceneTest.module.css";

/**
 * Prueba aislada de la base WebGL (useThreeScene.ts) -- 2026-08-19,
 * primera comprobación de que Three.js compila y renderiza dentro de
 * Next.js. Deliberadamente mínima: un único plano de color neutro con
 * una rotación muy lenta, fondo transparente. No sustituye nada
 * existente y no se monta en ninguna página de producción (no está
 * importado desde src/app/page.tsx ni desde ninguna sección) -- además,
 * por si acaso se importa en algún sitio más adelante sin querer, se
 * protege igualmente con NODE_ENV.
 */
export function ThreeSceneTest() {
  if (process.env.NODE_ENV !== "development") return null;
  return <ThreeSceneTestInner />;
}

function ThreeSceneTestInner() {
  const { containerRef, sceneRef, supported, reducedMotion, start, stop } = useThreeScene({
    onFrame: (_time, { scene }) => {
      if (reducedMotion) return; // estático -- sin rotación bajo prefers-reduced-motion
      const mesh = meshRef.current;
      if (!mesh) return;
      mesh.rotation.z += 0.0015; // muy lenta a propósito, solo para confirmar que el loop corre
      void scene;
    },
  });

  const meshRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !supported) return;

    const geometry = new THREE.PlaneGeometry(160, 160);
    const material = new THREE.MeshBasicMaterial({ color: 0x8f8a80, transparent: true, opacity: 0.9 });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    meshRef.current = mesh;

    start();

    return () => {
      stop();
      scene.remove(mesh);
      geometry.dispose();
      material.dispose();
      meshRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported]);

  return (
    <div className={styles.stage}>
      <div className={styles.canvasHost} ref={containerRef} />
      {!supported && <span className={styles.fallback}>WebGL no disponible</span>}
    </div>
  );
}
