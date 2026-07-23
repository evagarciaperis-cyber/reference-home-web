import type { Metadata } from "next";
import "./globals.css";

// Placeholder de andamiaje (Fase 0). El metadata real se define por ruta
// cuando se migre cada página (ver docs/ARQUITECTURA.md, sección 13).
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
      <body>{children}</body>
    </html>
  );
}
