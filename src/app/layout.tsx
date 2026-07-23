import type { Metadata } from "next";
import "./globals.css";
import { Preloader } from "@/ui/layout/Preloader";
import { NoiseOverlay } from "@/ui/layout/NoiseOverlay";
import { CustomCursor } from "@/ui/layout/CustomCursor";

// El metadata real se define por ruta cuando se migre cada página
// (ver docs/ARQUITECTURA.md, sección 13). Header/Footer/MobileMenu y el
// contenido de la home llegan en fases posteriores (ver docs/MIGRACION.md).
export const metadata: Metadata = {
  title: "Reference Home",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <Preloader />
        <NoiseOverlay />
        <CustomCursor />
        {children}
      </body>
    </html>
  );
}
