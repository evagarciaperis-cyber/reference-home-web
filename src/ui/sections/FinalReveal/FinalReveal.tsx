"use client";

import { useRef } from "react";
import { useFinalReveal } from "@/motion/hooks/useFinalReveal";
import { FooterContact } from "@/ui/sections/FooterContact";
import styles from "./FinalReveal.module.css";

// Wrapper de revelado -- envuelve ÚNICAMENTE FooterContact. BrandStory
// sigue siendo un elemento independiente y anterior en el documento (ver
// page.tsx): su propio pin narrativo (useBrandStory.ts) necesita flujo
// normal real para reservar distancia de scroll de verdad, algo que se
// rompería si viviera dentro de este wrapper. useFinalReveal.ts solo pinea
// ESTE wrapper (FooterContact, dentro, queda inmóvil por construcción);
// el ascenso de BrandStory que lo revela es la fase final del MISMO
// ScrollTrigger que ya gestiona sus 5 etapas, en useBrandStory.ts -- no
// hay ninguna animación aquí ni ningún gsap.set cruzado entre archivos.
export function FinalReveal() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  useFinalReveal({ wrapperRef });

  return (
    <div className={styles.finalReveal} ref={wrapperRef}>
      <div className={styles.footerLayer}>
        <FooterContact />
      </div>
    </div>
  );
}
