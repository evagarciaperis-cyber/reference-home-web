import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
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
};

export default nextConfig;
