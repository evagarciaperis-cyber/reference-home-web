import type { NextConfig } from "next";

// Versión estática de la home para referencehome.es (scripts/export-home.mjs):
// se construye en otra carpeta y sin el optimizador de imágenes de Vercel.
const EXPORT_HOME = process.env.NEXT_PUBLIC_EXPORT_HOME === "1";

const nextConfig: NextConfig = {
  distDir: EXPORT_HOME ? ".next-export" : ".next",
  images: {
    unoptimized: EXPORT_HOME,
    // Hero (docs/HERO_REDESIGN_SPEC.md, sección 16): AVIF primero, WebP como
    // fallback -- next/image negocia el formato según el header Accept del
    // navegador, así que basta con declarar el orden de preferencia aquí.
    formats: ["image/avif", "image/webp"],
    // Next.js 16 exige declarar explícitamente las calidades permitidas
    // (antes cualquier valor era válido). 70 se usa para el fondo del Hero
    // (fotografía grande, la pérdida a esa calidad es imperceptible y baja
    // mucho el peso); 75 es el valor por defecto del resto del sitio.
    qualities: [70, 75],
  },
  // Vista previa del blog estático (public/blog, generado en
  // mini-crm-referencehome/blog): /blog y /blog/<artículo> sirven su index.html.
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/blog", destination: "/blog/index.html" },
        { source: "/blog/:slug([a-z0-9-]+)", destination: "/blog/:slug/index.html" },
      ],
    };
  },
};

export default nextConfig;
