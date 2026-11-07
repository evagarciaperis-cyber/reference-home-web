import type { Metadata } from "next";
import NuevaPage from "./nueva/page";

/**
 * Portada.
 *
 * - En Vercel (vista previa) sigue la portada antigua; la web nueva vive en /nueva.
 * - En la versión estática que se sube a referencehome.es
 *   (NEXT_PUBLIC_EXPORT_HOME=1, ver scripts/export-home.mjs) la portada es la
 *   home nueva, indexable y con la dirección canónica del dominio.
 */
const EXPORT_HOME = process.env.NEXT_PUBLIC_EXPORT_HOME === "1";

const exportMetadata: Metadata = {
  metadataBase: new URL("https://referencehome.es"),
  title: "Reference Home | Inmobiliaria en Valencia para vender y comprar vivienda",
  description:
    "Inmobiliaria en Valencia. Valoramos, mostramos, negociamos y vendemos tu vivienda con estrategia, imagen y criterio. Oficinas en Valencia y Llombai.",
  robots: { index: true, follow: true },
  alternates: { canonical: "https://referencehome.es/" },
  openGraph: {
    type: "website",
    locale: "es_ES",
    siteName: "Reference Home",
    url: "https://referencehome.es/",
    title: "Reference Home | Inmobiliaria en Valencia",
    description: "Valoramos, mostramos, negociamos y vendemos tu vivienda en Valencia con estrategia, imagen y criterio.",
    images: [{ url: "/nueva/equipo/equipo-sofa.webp", width: 2000, height: 1548, alt: "El equipo de Reference Home" }],
  },
  twitter: { card: "summary_large_image" },
};

// La portada antigua se carga solo cuando hace falta, para que la versión
// estática no arrastre su código ni sus imágenes.
export async function generateMetadata(): Promise<Metadata> {
  if (EXPORT_HOME) return exportMetadata;
  return (await import("./OldHome")).oldHomeMetadata;
}

export default async function Home() {
  if (EXPORT_HOME) return <NuevaPage />;
  const { default: OldHome } = await import("./OldHome");
  return <OldHome />;
}
