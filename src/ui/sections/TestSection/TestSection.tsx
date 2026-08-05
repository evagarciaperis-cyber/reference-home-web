"use client";

import Image from "next/image";
import { useTestSectionFluidReveal } from "@/motion/webgl/useTestSectionFluidReveal";
import styles from "./TestSection.module.css";

// Misma fotografía que ya revela la mancha WebGL en escritorio -- en
// móvil (≤900px, sin hover/puntero continuo) es directamente el fondo a
// sangre completa de la sección, sin ningún mecanismo de revelado.
const MOBILE_BACKGROUND_SRC = "/images/valoracion/reveal-valoracion.png";

// Contenido tipográfico compartido -- EXCLUSIVAMENTE microtexto, titular
// y línea cursiva. Se renderiza DOS veces (capa negra + capa blanca
// enmascarada) desde el MISMO componente, nunca dos versiones del texto
// escritas a mano por separado: así ambas copias son, por construcción,
// idénticas en JSX, clases, ancho, line-height, letter-spacing,
// posición, responsive y saltos de línea. El CTA vive fuera de este
// componente a propósito -- ver nota en TestSection() más abajo.
function TestSectionCopy() {
  return (
    <>
      <span className={styles.micro}>Valoración de vivienda</span>
      <h2 className={styles.headline}>
        <span className={styles.headlineMain}>¿Quieres descubrir</span>
        <br />
        <span className={styles.headlineAccent}>cuánto vale tu casa?</span>
      </h2>
    </>
  );
}

// Bloque "valoración de vivienda" (2026-08-19) -- mancha orgánica WebGL
// con estela y disipación (useTestSectionFluidReveal.ts) que revela una
// imagen arquitectónica.
//
// El texto blanco se pinta en HTML real, no en el canvas: dos capas
// IDÉNTICAS de <TestSectionCopy/> (negra normal, siempre presente y
// accesible; blanca aria-hidden, recortada con un mask-image CSS que el
// hook actualiza a partir del mismo render target que ya alimenta la
// fotografía). Cada una es, por su cuenta, .textLayer: position:absolute;
// inset:0 sobre TODA la sección, con su propio flex-column
// justify-content:center centrando sus 2 hijos (microtexto + titular)
// dentro de esa caja a sangre completa -- ninguna de las dos participa
// en ningún flex EXTERNO (el de .section es irrelevante para ellas,
// igual que antes de que existiera el CTA). Como ambas tienen
// EXACTAMENTE el mismo contenido y las mismas reglas, coinciden al
// píxel por construcción.
//
// 2026-08-20 (esta ronda): el CTA "Valora tu vivienda" pasó por dos
// versiones rotas -- primero dentro de la capa negra (le añadía un
// tercer hijo en flex que la blanca no tenía), después como hermano de
// un wrapper .copyStack que SÍ participaba en el flex-column de
// .section (eso cambiaba cómo se repartía el espacio vertical y volvía
// a mover el texto). La estructura de texto de arriba es literalmente
// la que ya funcionaba antes de tocar nada del CTA -- sin cambios. El
// CTA ahora es .ctaLayer: position:absolute respecto a .section (no un
// hijo de flex de nada), así que activarlo o quitarlo no puede mover ni
// un píxel ninguna de las dos capas de texto.
//
// CTA: mismo href ("#contacto") que el CTA principal del Hero -- no
// existe una ruta/formulario de valoración propio en el proyecto. No se
// reutiliza el hook useMagnetic del Hero (efecto de cursor propio de ese
// botón circular, no un componente encapsulado) para no sumar un
// segundo sistema de seguimiento de puntero sobre esta sección, que ya
// tiene el suyo propio para la mancha.
export function TestSection() {
  const { sectionRef, canvasHostRef, whiteLayerRef, onPointerEnter, onPointerMove, onPointerLeave } =
    useTestSectionFluidReveal();

  return (
    <section
      ref={sectionRef}
      className={styles.section}
      onPointerEnter={onPointerEnter}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <div ref={canvasHostRef} className={styles.canvasHost} aria-hidden="true" />

      {/* ≤900px únicamente (TestSection.module.css) -- sin hover ni
          puntero continuo, la mancha de cursor no tiene equivalente
          táctil. En vez de simular una interacción, la fotografía que la
          mancha revela en escritorio pasa a ser directamente el fondo a
          sangre completa: composición fotográfica fija, sin ningún
          mecanismo de revelado. Invisible en escritorio (display:none en
          la regla base, donde sigue mandando .canvasHost/la mancha). */}
      <div className={styles.mobilePhotoLayer} aria-hidden="true">
        <Image
          src={MOBILE_BACKGROUND_SRC}
          alt=""
          fill
          sizes="100vw"
          quality={75}
          className={styles.mobilePhoto}
        />
        {/* Capa de contraste sutil -- un lavado plano, nunca un degradado
            agresivo ni blur, solo lo necesario para que el titular negro
            (sin cambiar de color respecto al actual) siga siendo legible
            sobre una fotografía real. */}
        <div className={styles.mobileScrim} />
      </div>

      <div className={styles.textLayer}>
        <TestSectionCopy />
      </div>

      <div className={`${styles.textLayer} ${styles.textLayerWhite}`} ref={whiteLayerRef} aria-hidden="true">
        <TestSectionCopy />
      </div>

      {/* Fuera del flujo por completo -- position:absolute respecto a
          .section, no un hijo de flex. wrapper pointer-events:none, el
          enlace en sí pointer-events:auto. */}
      <div className={styles.ctaLayer}>
        <a className={styles.cta} href="#contacto">
          <span className={styles.ctaText}>Valora tu vivienda</span>
          <svg className={styles.ctaArrow} viewBox="0 0 24 12" aria-hidden="true" focusable="false">
            <path
              d="M0 6 H20 M13 1 L20 6 L13 11"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
      </div>
    </section>
  );
}
