import type { Metadata } from "next";
import { Hero } from "@/ui/sections/Hero";
import { Manifesto } from "@/ui/sections/Manifesto";
import { MarketingReel } from "@/ui/sections/MarketingReel";
import { SellingErrors } from "@/ui/sections/SellingErrors";
import { BrandPause } from "@/ui/sections/BrandPause";
import { ProjectsGallery } from "@/ui/sections/ProjectsGallery";
import { BuyerExperience } from "@/ui/sections/BuyerExperience";
import { Process } from "@/ui/sections/Process";
import { ProcessTeamPause } from "@/ui/sections/ProcessTeamPause";
import { WorkZoom } from "@/ui/sections/WorkZoom";
import { BrandStory } from "@/ui/sections/BrandStory";
import { FinalReveal } from "@/ui/sections/FinalReveal";

// Puerto literal de las <meta> de web-nueva/index.html (título,
// description) -- fase 15, metadata técnica mínima, docs/MIGRACION.md.
// Sin metadataBase (no hay dominio de despliegue todavío decidido): el
// canonical queda relativo, válido pero sin resolver a absoluto hasta que
// se fije. Sin imagen de Open Graph -- no existe ninguna diseñada para
// ese uso todavía (regla nº2 de la fase 15: no inventar imágenes
// sociales definitivas).
const TITLE = "Reference Study — Experiencia digital";
const DESCRIPTION =
  "Estudio web independiente de una experiencia editorial y cinética. Proyecto estático listo para FTP.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    locale: "es_ES",
    siteName: "Reference Study",
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESCRIPTION,
  },
};

// <main> envuelve el contenido tal como en el index.html original; se
// trasladará a app/(marketing)/layout.tsx cuando exista ese route group
// (igual que Header/MobileMenu, ver layout.tsx).
// 2026-08-25: Contact (sección independiente) y Footer (layout, hermano
// de <main>) se eliminan y se sustituyen por FinalReveal, que envuelve a
// FooterContact -- mismo lugar en el árbol que ocupaba el Footer antiguo
// (hermano de <main>, justo después de BrandStory, NO dentro de <main>):
// esa adyacencia es la que permite que el ScrollTrigger del relevo
// (useFinalReveal.ts) arranque exactamente donde termina el pin
// narrativo de BrandStory, sin hueco. BrandStory se queda dentro de
// <main>, sin cambios -- FinalReveal solo contiene FooterContact (ver
// useFinalReveal.ts para por qué BrandStory no puede vivir anidado ahí
// dentro sin romper su propio pin de 5 etapas).
export default function Home() {
  return (
    <>
      <main>
        <Hero />
        <Manifesto />
        <MarketingReel />
        <SellingErrors />
        <BrandPause />
        <ProjectsGallery />
        <BuyerExperience />
        <Process />
        <ProcessTeamPause />
        <WorkZoom />
        <BrandStory />
      </main>
      <FinalReveal />
    </>
  );
}
