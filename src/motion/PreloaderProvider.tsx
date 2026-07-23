"use client";

import { createContext, useContext } from "react";
import { usePreloader } from "./hooks/usePreloader";

const PreloaderReadyContext = createContext(false);

/**
 * Calcula el estado "ready" del preloader UNA sola vez (vía usePreloader,
 * fase 2) y lo comparte por contexto. Preloader y Hero viven en partes
 * distintas del árbol (layout raíz vs. page.tsx) sin un padre común
 * cercano donde levantar el estado con props — si cada uno llamara a
 * usePreloader() por su cuenta, habría dos temporizadores/listeners de
 * `load` independientes calculando lo mismo (regla nº4 de la Fase 4: sin
 * lógica duplicada). Envuelve el layout raíz, por encima de Preloader y de
 * {children}.
 */
export function PreloaderProvider({ children }: { children: React.ReactNode }) {
  const { ready } = usePreloader();
  return <PreloaderReadyContext.Provider value={ready}>{children}</PreloaderReadyContext.Provider>;
}

export function usePreloaderReady(): boolean {
  return useContext(PreloaderReadyContext);
}
