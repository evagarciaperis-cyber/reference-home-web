"use client";

import { usePathname } from "next/navigation";

/**
 * Oculta parte del "chrome" de la web actual (precargador, ruido y cursor)
 * en las rutas de la web nueva. La cabecera sí se comparte.
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
