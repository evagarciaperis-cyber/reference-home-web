import type { Metadata } from "next";
import { Cormorant_Garamond, Montserrat } from "next/font/google";
import { DayHouse } from "@/ui/nueva/DayHouse";
import { CityScene } from "@/ui/nueva/CityScene";
import styles from "./nueva.module.css";

// Web nueva (prototipo de portada). No se indexa mientras convive con la
// web actual: cuando sustituya a la home, el title/description definitivos
// y el canonical pasan a la ruta raíz.
export const metadata: Metadata = {
  title: "Reference Home | Inmobiliaria en Valencia",
  description:
    "Inmobiliaria en Valencia. Valoramos, mostramos, negociamos y vendemos tu vivienda con estrategia, imagen y criterio.",
  robots: { index: false, follow: false },
};

const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--nw-serif-font",
  display: "swap",
});

const sans = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--nw-sans-font",
  display: "swap",
});

export default function NuevaPage() {
  return (
    <div className={`${serif.variable} ${sans.variable} ${styles.root}`}>
      <main>
        <DayHouse fontFamily={serif.style.fontFamily} />
        <CityScene />
        <section className={styles.next} aria-labelledby="next-title">
          <p className={styles.eyebrow}>Escena 4 · en construcción</p>
          <h2 id="next-title" className={styles.nextTitle}>
            Casos <em>reales</em>
          </h2>
          <p className={styles.nextText}>
            Aquí llegarán las viviendas vendidas en un vuelo en profundidad: cada una con su precio y los días que tardó en venderse.
          </p>
        </section>
      </main>
    </div>
  );
}
