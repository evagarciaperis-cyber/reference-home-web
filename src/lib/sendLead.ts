/**
 * Envío de los formularios de la home.
 *
 * - En Vercel (vista previa): POST a /api/contact con Turnstile, como hasta ahora.
 * - En la versión estática que se sube a referencehome.es
 *   (NEXT_PUBLIC_STATIC_FORMS=1, ver scripts/export-home.mjs): POST al mismo
 *   receptor que las landings, /herramientas/enviar.php, que manda el aviso a
 *   reference@referencehome.es y tiene su propia trampa anti-spam y límite de
 *   envíos. Ahí no hace falta Turnstile.
 */
export const STATIC_FORMS = process.env.NEXT_PUBLIC_STATIC_FORMS === "1";

const ENVIAR_ERRORS: Record<string, string> = {
  nombre: "Escribe tu nombre, por favor.",
  contacto: "Déjanos un teléfono o un email para poder llamarte.",
  email: "Revisa el email, parece que no es correcto.",
  consentimiento: "Para enviarlo, acepta la política de privacidad.",
  demasiados: "Has enviado varias solicitudes seguidas. Espera unos minutos o llámanos al 963 547 596.",
  origen: "No se pudo enviar desde esta página. Llámanos al 963 547 596.",
};

/**
 * @param data   FormData del formulario (campos name, phone, email, privacy,
 *               company como trampa anti-spam, message…).
 * @param landing identificador del formulario para el email del equipo.
 */
export async function sendLead(data: FormData, landing: string): Promise<void> {
  if (!STATIC_FORMS) {
    const res = await fetch("/api/contact", { method: "POST", body: data, headers: { Accept: "application/json" } });
    const json = await res.json();
    if (!res.ok || !json.ok) throw new Error(json.message || "No se pudo enviar.");
    return;
  }

  const out = new FormData();
  out.set("nombre", String(data.get("name") ?? "").trim());
  out.set("telefono", String(data.get("phone") ?? "").trim());
  out.set("email", String(data.get("email") ?? "").trim());
  out.set("consentimiento", data.get("privacy") ? "1" : "");
  out.set("website", String(data.get("company") ?? ""));
  out.set("landing", landing);
  const detalle = [
    data.get("topic") ? `Le interesa: ${data.get("topic")}` : "",
    String(data.get("message") ?? "").trim(),
  ]
    .filter(Boolean)
    .join("\n");
  out.set("detalle", detalle.slice(0, 2000));

  let json: { ok?: boolean; error?: string } = {};
  try {
    const res = await fetch("/herramientas/enviar.php", { method: "POST", body: out, credentials: "same-origin" });
    json = await res.json();
  } catch {
    throw new Error("No se pudo enviar. Escríbenos por WhatsApp al 674 61 22 72 o llama al 963 547 596.");
  }
  if (!json.ok) {
    throw new Error(ENVIAR_ERRORS[json.error ?? ""] ?? "No se pudo enviar. Escríbenos por WhatsApp al 674 61 22 72 o llama al 963 547 596.");
  }
  // Aviso en el CRM con push (además del email). Si el CRM no responde, el email ya ha llegado.
  try {
    void fetch("https://crm.referencehome.es/api/public/visita", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "omit",
      body: JSON.stringify({
        name: out.get("nombre"),
        phone: out.get("telefono"),
        email: out.get("email"),
        landing,
        detail: detalle,
        website: out.get("website"),
        consent: true,
      }),
    }).catch(() => {});
  } catch {
    // sin aviso en el CRM; el email ya está enviado
  }
  if (typeof window !== "undefined") {
    const w = window as unknown as { gtag?: (...a: unknown[]) => void };
    w.gtag?.("event", "generate_lead", { lead_method: "form", form_id: landing });
  }
}
