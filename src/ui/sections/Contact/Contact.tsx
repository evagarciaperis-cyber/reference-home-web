"use client";

import { useState } from "react";
import { SectionLabel } from "@/ui/primitives/SectionLabel";
import { useMagnetic } from "@/motion/hooks/useMagnetic";
import styles from "./Contact.module.css";

// Puerto literal del bloque [data-contact-form] de main.js: intercepta el
// submit, hace fetch al mismo action del <form> (send.php) esperando JSON
// {ok, message}, y muestra el resultado en .form-status. No hay backend
// real detrás de send.php en este proyecto (ni lo había de forma
// funcional en el estático original sin PHP desplegado) -- se porta la
// MISMA lógica de intento/error, sin construir ningún servicio de envío
// nuevo (regla nº4 de la Fase 13: sin integración real de envío).
async function submitContactForm(form: HTMLFormElement): Promise<string> {
  const response = await fetch(form.action, {
    method: "POST",
    body: new FormData(form),
    headers: { Accept: "application/json" },
  });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.message || "No se pudo enviar.");
  return data.message as string;
}

// Puerto literal de la sección .contact (id="contacto"): intro + formulario
// de contacto. Está en la lista original de "secciones oscuras" de
// main.js, así que lleva data-header-tone="dark" (mismo mecanismo que
// Solutions/Process, fases 6/8).
export function Contact() {
  const [status, setStatus] = useState("");
  const [disabled, setDisabled] = useState(false);
  const buttonRef = useMagnetic<HTMLButtonElement>();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus("Enviando…");
    setDisabled(true);
    try {
      const message = await submitContactForm(form);
      setStatus(message);
      form.reset();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Ha ocurrido un error.");
    } finally {
      setDisabled(false);
    }
  };

  return (
    <section className={styles.contact} id="contacto" data-header-tone="dark">
      <div className={styles.intro}>
        <SectionLabel number="08" light>
          Inicia la conversación
        </SectionLabel>
        <h2>
          Empieza tu
          <br />
          <em>proyecto hoy</em>
        </h2>
        <p>
          El formulario está preparado para conectarse a un servidor PHP convencional. Cambia el correo receptor en{" "}
          <code>config.php</code>.
        </p>
      </div>
      <form className={styles.form} action="send.php" method="post" data-contact-form onSubmit={handleSubmit}>
        <input type="text" name="company" className={styles.hp} tabIndex={-1} autoComplete="off" aria-hidden="true" />
        <label>
          <span>Nombre completo*</span>
          <input type="text" name="name" required autoComplete="name" />
        </label>
        <label>
          <span>Teléfono*</span>
          <input type="tel" name="phone" required autoComplete="tel" />
        </label>
        <label>
          <span>Correo electrónico*</span>
          <input type="email" name="email" required autoComplete="email" />
        </label>
        <label>
          <span>Mensaje</span>
          <textarea name="message" rows={4} />
        </label>
        <label className={styles.consent}>
          <input type="checkbox" name="privacy" required />
          <span>
            Acepto la <a href="privacidad.html">política de privacidad</a>.
          </span>
        </label>
        <button ref={buttonRef} className={styles.submitButton} type="submit" disabled={disabled}>
          <span>Enviar proyecto</span>
          <i>↗</i>
        </button>
        <p className={styles.formStatus} role="status" aria-live="polite">
          {status}
        </p>
      </form>
    </section>
  );
}
