import type { Metadata } from "next";
import { InmobiliariaValencia } from "@/ui/pages/InmobiliariaValencia";
import { FooterContact } from "@/ui/sections/FooterContact";

// Página real y nueva del proyecto (no del oráculo original) --
// docs/INMOBILIARIA_VALENCIA_MASTERPLAN.md y
// docs/INMOBILIARIA_VALENCIA_STORYBOARD.md, ya aprobados. Por ahora solo
// contiene el placeholder (InmobiliariaValencia) + el mismo Footer que el
// resto del sitio -- Header/MobileMenu/Preloader/NoiseOverlay/CustomCursor
// ya se aplican a toda la app desde el layout raíz (layout.tsx), así que
// esta página los hereda sin ningún trabajo adicional, igual que
// not-found.tsx.
//
// robots noindex,nofollow mientras el contenido sea un placeholder --
// quitar en cuanto se publique la experiencia definitiva (docs citados).
export const metadata: Metadata = {
  title: "Vender tu vivienda en Valencia — Reference Home",
  description:
    "La experiencia completa para vender tu vivienda en Valencia con Reference Home. Página en construcción.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/inmobiliaria-valencia" },
};

export default function InmobiliariaValenciaPage() {
  return (
    <>
      <main>
        <InmobiliariaValencia />
      </main>
      <FooterContact />
    </>
  );
}
