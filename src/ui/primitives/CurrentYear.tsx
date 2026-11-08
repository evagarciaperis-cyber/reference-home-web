"use client";

import { useSyncExternalStore } from "react";

/**
 * Año actual que se actualiza solo. La home se exporta como HTML estático,
 * así que el año del build queda escrito en la página (getServerSnapshot);
 * al cargar en el navegador React usa el año del visitante (getSnapshot).
 * Así el «© año» cambia solo cada 1 de enero sin volver a generar la web.
 */
const BUILD_YEAR = new Date().getFullYear();
const subscribe = () => () => {};
const clientYear = () => new Date().getFullYear();
const buildYear = () => BUILD_YEAR;

export default function CurrentYear() {
  return <>{useSyncExternalStore(subscribe, clientYear, buildYear)}</>;
}
