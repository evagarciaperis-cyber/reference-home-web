import type { Metadata } from "next";
import "./globals.css";
import { PreloaderProvider } from "@/motion/PreloaderProvider";
import { Preloader } from "@/ui/layout/Preloader";
import { NoiseOverlay } from "@/ui/layout/NoiseOverlay";
import { CustomCursor } from "@/ui/layout/CustomCursor";
import { SiteHeader } from "@/ui/layout/SiteHeader";

// El metadata real se define por ruta cuando se migre cada página
// (ver docs/ARQUITECTURA.md, sección 13). El contenido de la home llega en
// fases posteriores (ver docs/MIGRACION.md).
export const metadata: Metadata = {
  title: "Reference Home",
};

// Header/MobileMenu viven en el layout raíz por ahora porque es la única
// superficie que existe todavía. docs/ARQUITECTURA.md (sección 4) los sitúa
// en app/(marketing)/layout.tsx junto al Footer; ese route group se crea
// cuando haga falta separar (marketing) de (privado)/(propiedades)/(blog) —
// mover Header/MobileMenu en ese momento es solo cambiar dónde se importan.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <PreloaderProvider>
          <Preloader />
          <NoiseOverlay />
          <CustomCursor />
          <SiteHeader />
          {children}
        </PreloaderProvider>
      </body>
    </html>
  );
}
