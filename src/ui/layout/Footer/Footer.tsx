import styles from "./Footer.module.css";

// Puerto literal de <footer class="site-footer"> de index.html. Está en la
// lista original de "secciones oscuras" de main.js, así que lleva
// data-header-tone="dark" (mismo mecanismo que Solutions/Process/Contact).
// Vive fuera de <main> -- igual que en el original, es hermano de <main>,
// no un hijo (ver Home en page.tsx). data-site-footer es un atributo
// nuevo, solo para identificación estable en tests -- el original no
// tenía id ni data-* propios en este nivel.
export function Footer() {
  return (
    <footer className={styles.footer} data-header-tone="dark" data-site-footer>
      <div className={styles.top}>
        <span>REFERENCE</span>
        <span>HOME</span>
      </div>
      <div className={styles.grid}>
        <div>
          <p>
            Experiencia digital independiente
            <br />
            para estudio y transformación.
          </p>
        </div>
        <div>
          <h3>Enlaces</h3>
          <a href="#inicio">Inicio</a>
          <a href="#soluciones">Soluciones</a>
          <a href="#proyectos">Proyectos</a>
        </div>
        <div>
          <h3>Contacto</h3>
          <a href="mailto:hola@tudominio.es">hola@tudominio.es</a>
          <a href="tel:+34000000000">+34 000 000 000</a>
        </div>
        <div>
          <h3>Legal</h3>
          <a href="privacidad.html">Privacidad</a>
          <a href="README.txt">Documentación</a>
        </div>
      </div>
      <div className={styles.bottom}>
        <span>© 2026 Reference Study</span>
        <span>Proyecto estático listo para FTP</span>
        <a href="#inicio">Volver arriba ↑</a>
      </div>
    </footer>
  );
}
