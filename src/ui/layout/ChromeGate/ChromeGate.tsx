"use client";

import { usePathname } from "next/navigation";

/**
 * Oculta el "chrome" de la web actual (precargador, ruido, cursor y
 * cabecera) en las rutas de la web nueva, que traen el suyo propio.
 * Mientras conviven las dos webs en el mismo proyecto, esto evita tocar
 * cada componente por separado; cuando la web nueva sustituya a la actual,
 * este componente desaparece junto con el chrome antiguo.
 */
const NEW_SITE_PREFIXES = ["/nueva"];

export function ChromeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const isNewSite = NEW_SITE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (isNewSite) return null;
  return <>{children}</>;
}
