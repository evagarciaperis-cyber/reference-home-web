import { Hero } from "@/ui/sections/Hero";
import { Manifesto } from "@/ui/sections/Manifesto";
import { Solutions } from "@/ui/sections/Solutions";
import { ProjectsGallery } from "@/ui/sections/ProjectsGallery";

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
    </main>
  );
}
