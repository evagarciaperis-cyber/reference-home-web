import Link from "next/link";
import { Eyebrow } from "@/ui/primitives/Eyebrow";
import styles from "./NotFound.module.css";

// Puerto literal de web-nueva/404.html: el original es una página aislada
// sin Header/Footer/NoiseOverlay/CustomCursor (<body class="legal-page">
// sin más). Decisión consciente tomada con el usuario: se mantiene el
// shell global (Header/Preloader/NoiseOverlay/CustomCursor ya se aplican
// a toda la app desde el layout raíz, decisión de las fases 2/3) y se
// añade Footer, en vez de reestructurar el árbol de layouts para aislar
// esta única página -- el contenido propio (eyebrow, titular, párrafo,
// enlace de vuelta) se porta literal dentro de ese shell. .legal-page se
// aplica a un contenedor propio, no a <body> (compartido por toda la
// app).
export function NotFound() {
  return (
    <div className={styles.legalPage}>
      <main>
        <Eyebrow>Error 404</Eyebrow>
        <h1>
          Esta página
          <br />
          no existe.
        </h1>
        <p>El enlace puede haber cambiado o la página todavía no está creada.</p>
        <Link className={styles.textLink} href="/">
          Volver al inicio <span>↗</span>
        </Link>
      </main>
    </div>
  );
}
