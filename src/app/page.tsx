import { Hero } from "@/ui/sections/Hero";
import { Manifesto } from "@/ui/sections/Manifesto";
import { Solutions } from "@/ui/sections/Solutions";
import { ProjectsGallery } from "@/ui/sections/ProjectsGallery";
import { Process } from "@/ui/sections/Process";
import { WorkZoom } from "@/ui/sections/WorkZoom";
import { BrandStory } from "@/ui/sections/BrandStory";
import { Principles } from "@/ui/sections/Principles";
import { Stats } from "@/ui/sections/Stats";
import { Contact } from "@/ui/sections/Contact";
import { Footer } from "@/ui/layout/Footer";

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
