import { Hero } from "@/ui/sections/Hero";
import { Manifesto } from "@/ui/sections/Manifesto";
import { Solutions } from "@/ui/sections/Solutions";
import { ProjectsGallery } from "@/ui/sections/ProjectsGallery";
import { Process } from "@/ui/sections/Process";
import { WorkZoom } from "@/ui/sections/WorkZoom";
import { BrandStory } from "@/ui/sections/BrandStory";

// El resto de secciones de la home llegan en fases posteriores (ver
// docs/MIGRACION.md). <main> envuelve el contenido tal como en el
// index.html original; se trasladará a app/(marketing)/layout.tsx cuando
// exista ese route group (igual que Header/MobileMenu, ver layout.tsx).
export default function Home() {
  return (
    <main>
      <Hero />
      <Manifesto />
      <Solutions />
      <ProjectsGallery />
      <Process />
      <WorkZoom />
      <BrandStory />
    </main>
  );
}
