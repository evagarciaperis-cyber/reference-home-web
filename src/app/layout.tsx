import type { Metadata, Viewport } from "next";
import { Inter, Nunito_Sans, Great_Vibes } from "next/font/google";
import "./globals.css";
import { PreloaderProvider } from "@/motion/PreloaderProvider";
import { SmoothScrollProvider } from "@/motion/SmoothScrollProvider";
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

// Réplica visual del bloque "En nuestra agencia" de Cosmosia (Manifesto,
// 2026-07-27): las tres familias que usa ese bloque real (inspeccionadas
// vía DevTools, no estimadas) -- Inter para el cuerpo del manifiesto,
// Nunito Sans 500 para la microcabecera, Great Vibes 400 para las palabras
// destacadas en cursiva. Las tres son de licencia libre (SIL OFL, Google
// Fonts) -- next/font/google las autohospeda en build, sin peticiones a
// Google en runtime. Ningún otro bloque del sitio las usa todavía.
//
// Corrección 2026-07-27 (jerarquía editorial): Inter pasa de un solo peso
// (500) a tres (400/500/600) para la variación de énfasis palabra a
// palabra del manifiesto (Manifesto.module.css .emphasisLight/.emphasisBase400/
// .emphasisHeavy*) -- siguen siendo la MISMA familia, no una nueva.
const manifestoSans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-manifesto-sans",
  display: "swap",
});

const manifestoMicro = Nunito_Sans({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-manifesto-micro",
  display: "swap",
});

const manifestoScript = Great_Vibes({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-manifesto-script",
  display: "swap",
});

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
    <html
      lang="es"
      className={`${manifestoSans.variable} ${manifestoMicro.variable} ${manifestoScript.variable}`}
    >
      <body>
        <SmoothScrollProvider>
          <PreloaderProvider>
            <Preloader />
            <NoiseOverlay />
            <CustomCursor />
            <SiteHeader />
            {children}
          </PreloaderProvider>
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
