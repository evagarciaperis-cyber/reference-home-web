"use client";

import { useEffect, useLayoutEffect } from "react";

// 2026-08-05 -- extraído de useFinalReveal.ts al corregir el
// NotFoundError "removeChild" reproducido navegando Home -> /inmobiliaria-valencia
// (ver el comentario largo en useFinalReveal.ts para la causa raíz
// completa, verificada contra el propio bundle de react-dom del
// proyecto). Cualquier otro hook que pinee/reestructure el DOM (GSAP
// ScrollTrigger u otro) en un elemento que pueda quedar como hijo
// DIRECTO de un contenedor persistente entre navegaciones (aquí,
// <body>, vía el layout raíz) debe limpiar con este hook en vez de
// `useEffect` normal, por el mismo motivo.
//
// `useLayoutEffect` no hace nada útil en el servidor y React emite una
// advertencia en consola si se usa en un componente que también se
// renderiza en el servidor (todo componente cliente de Next.js se
// renderiza en el servidor para el HTML inicial) -- de ahí el guard por
// `typeof window`, patrón estándar (Redux, Framer Motion, etc.): en el
// servidor se queda en `useEffect` normal (que ahí no hace nada dañino,
// simplemente no se ejecuta antes de la hidratación), y en el cliente
// pasa a ser el `useLayoutEffect` real que necesitamos.
export const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
