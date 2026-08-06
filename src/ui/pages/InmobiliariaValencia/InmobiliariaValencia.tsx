import Link from "next/link";
import { ValenciaOpening } from "@/ui/sections/ValenciaOpening";
import styles from "./InmobiliariaValencia.module.css";

// 2026-08-05: la Escena 01 ("La fachada", ya aprobada) sustituye la
// apertura de este placeholder -- por eso el título de abajo baja de
// <h1> a <h2> (el <h1> real de la página ahora vive en
// ValenciaOpening). El resto del placeholder se mantiene TAL CUAL, sin
// ampliarlo: sigue ocupando el hueco de las escenas 02-08 mientras se
// construyen, una a una, sobre docs/INMOBILIARIA_VALENCIA_MASTERPLAN.md
// y docs/INMOBILIARIA_VALENCIA_STORYBOARD.md (ya aprobados). Vive sobre
// el mismo territorio oscuro (--color-bg-secondary) en el que termina de
// subir la cubierta de ValenciaOpening, así que la costura entre ambas
// es coherente mientras tanto.
export function InmobiliariaValencia() {
  return (
    <>
      <ValenciaOpening />
      <section className={styles.placeholder} data-header-tone="dark">
        <div className={styles.inner}>
          <p className={styles.eyebrow}>
            <span className={styles.eyebrowRule} />
            Vender en Valencia
          </p>
          <h2 className={styles.title}>
            Esta página está tomando forma.
            <span className={styles.titleAccent}>Muy pronto, aquí.</span>
          </h2>
          <p className={styles.support}>
            Estamos construyendo la experiencia completa para quienes quieren vender su
            vivienda en Valencia con Reference Home — capítulo a capítulo, con el mismo
            cuidado que el resto del sitio.
          </p>
          <Link className={styles.back} href="/">
            Volver al inicio <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>
    </>
  );
}
