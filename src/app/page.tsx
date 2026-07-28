import type { Metadata } from "next";
import { Hero } from "@/ui/sections/Hero";
import { Manifesto } from "@/ui/sections/Manifesto";
import { MarketingReel } from "@/ui/sections/MarketingReel";
import { SellingErrors } from "@/ui/sections/SellingErrors";
import { Solutions } from "@/ui/sections/Solutions";
import { ProjectsGallery } from "@/ui/sections/ProjectsGallery";
import { Process } from "@/ui/sections/Process";
import { WorkZoom } from "@/ui/sections/WorkZoom";
import { BrandStory } from "@/ui/sections/BrandStory";
import { Principles } from "@/ui/sections/Principles";
import { Stats } from "@/ui/sections/Stats";
import { Contact } from "@/ui/sections/Contact";
import { Footer } from "@/ui/layout/Footer";

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

// Con Contact se completa el contenido de la home de paridad estricta (ver
// docs/MIGRACION.md). <main> envuelve el contenido tal como en el
// index.html original; se trasladará a app/(marketing)/layout.tsx cuando
// exista ese route group (igual que Header/MobileMenu, ver layout.tsx).
// Footer es hermano de <main>, no un hijo -- </main> cierra justo después
// de Contact en el original, y <footer> viene a continuación, fuera de él.
export default function Home() {
  return (
    <>
      <main>
        <Hero />
        <Manifesto />
        <MarketingReel />
        <SellingErrors />
        <Solutions />
        <ProjectsGallery />
        <Process />
        <WorkZoom />
        <BrandStory />
        <Principles />
        <Stats />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
