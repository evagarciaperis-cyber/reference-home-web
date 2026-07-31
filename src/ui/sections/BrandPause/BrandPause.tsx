"use client";

import Image from "next/image";
import { useBrandPause } from "./useBrandPause";
import styles from "./BrandPause.module.css";
import fondofiligrana from "../../../../images/fondofiligrana.png";

const cx = (...classes: Array<string | false | undefined>) => classes.filter(Boolean).join(" ");

// Pausa de marca (2026-07-30, una sola pantalla): separación cromática entre
// SellingErrors y ProjectsGallery -- ver useBrandPause.ts para la
// arquitectura completa (deliberadamente sin pin). Copy literal, sin
// subtítulo, sin CTA -- el texto sigue siendo el protagonista, centrado
// dentro de un bloque de 100svh, sobre la filigrana decorativa de fondo
// ("fondofiligrana", única decoración -- sin SVG ni trazos añadidos).
// "cómo" sigue siendo el gesto tipográfico principal.
//
// Escritorio (.desktopTitle) y móvil (.mobileTitle) son dos marcados
// paralelos -- no una compresión del mismo -- alternados por CSS
// (BrandPause.module.css, @media max-width:640px). "cómo" es el único
// tramo en serif itálica en ambos; el resto es la sans principal del
// proyecto, en dos pesos.
export function BrandPause() {
  const {
    sectionRef,
    stageRef,
    labelRef,
    line1Ref,
    enRef,
    comoRef,
    seHaceRef,
    mLine1Ref,
    mEnRef,
    mComoRef,
    mLine3Ref,
  } = useBrandPause();

  return (
    <section
      className={styles.section}
      ref={sectionRef}
      data-header-tone="dark"
      data-header-hide="true"
    >
      <div className={styles.stage} ref={stageRef}>
        {/* Filigrana decorativa (2026-07-29): capa intermedia entre el verde
            de fondo y el contenido tipográfico -- exactamente ese orden
            (color -> filigrana -> texto), pedido explícito de esta ronda.
            A sangre sobre todo el bloque, object-fit:cover, opacidad baja
            (.filigrana en BrandPause.module.css): nunca compite con el
            titular ni con "cómo". */}
        <Image
          src={fondofiligrana}
          alt=""
          fill
          sizes="100vw"
          aria-hidden="true"
          className={styles.filigrana}
        />

        <div className={styles.eyebrow} ref={labelRef}>
          <span className={styles.eyebrowNumber}>02</span>
          <span className={styles.eyebrowLine} />
          <span className={styles.eyebrowText}>Nuestra forma de hacer</span>
        </div>

        <h2 className={styles.title}>
          <span className={styles.desktopTitle}>
            <span className={styles.lineMask}>
              <span className={cx(styles.segment, styles.sansMain)} ref={line1Ref}>
                La diferencia está
              </span>
            </span>
            <span className={styles.lineMask}>
              <span className={styles.line2Row}>
                <span className={cx(styles.segment, styles.sansLight, styles.enWord)} ref={enRef}>
                  en
                </span>{" "}
                <span className={cx(styles.segment, styles.serifItalic, styles.como)} ref={comoRef}>
                  cómo
                </span>{" "}
                <span className={cx(styles.segment, styles.sansMain)} ref={seHaceRef}>
                  se hace.
                </span>
              </span>
            </span>
          </span>

          <span className={styles.mobileTitle}>
            <span className={styles.lineMask}>
              <span className={cx(styles.segment, styles.sansMain)} ref={mLine1Ref}>
                La diferencia
              </span>
            </span>
            <span className={styles.lineMask}>
              <span className={styles.line2Row}>
                <span className={cx(styles.segment, styles.sansLight)} ref={mEnRef}>
                  está en
                </span>{" "}
                <span className={cx(styles.segment, styles.serifItalic, styles.como)} ref={mComoRef}>
                  cómo
                </span>
              </span>
            </span>
            <span className={styles.lineMask}>
              <span className={cx(styles.segment, styles.sansMain)} ref={mLine3Ref}>
                se hace.
              </span>
            </span>
          </span>
        </h2>
      </div>
    </section>
  );
}
