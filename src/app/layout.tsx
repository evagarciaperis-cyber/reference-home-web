import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PreloaderProvider } from "@/motion/PreloaderProvider";
import { Preloader } from "@/ui/layout/Preloader";
import { NoiseOverlay } from "@/ui/layout/NoiseOverlay";
import { CustomCursor } from "@/ui/layout/CustomCursor";
import { SiteHeader } from "@/ui/layout/SiteHeader";

// Metadata técnica mínima, compartida por toda la app (fase 15,
// docs/MIGRACION.md): viewport y theme-color, puerto literal de las
// <meta> del original (index.html líneas 5/7). El title/description/OG/
// canonical propios de la home se declaran en page.tsx -- cada ruta
// futura (404 ya lo hace, páginas interiores más adelante) los
// sobrescribe con los suyos.
export const metadata: Metadata = {
  title: "Reference Home",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#11110f",
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
