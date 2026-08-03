import { NextResponse } from "next/server";

// Verificación real de Cloudflare Turnstile en servidor (punto 7 del
// pedido) -- FooterContact.tsx ya no apunta a send.php (stub sin
// backend), sino a este endpoint. TURNSTILE_SECRET_KEY vive solo en
// variable de entorno de servidor (.env.local, sin prefijo NEXT_PUBLIC_),
// nunca llega al cliente. Mismo contrato de respuesta {ok, message} que
// ya esperaba submitContactForm en el cliente, así que ese código no
// cambió su forma de leer la respuesta.
const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type SiteverifyResponse = { success: boolean; ["error-codes"]?: string[] };

export async function POST(request: Request) {
  const formData = await request.formData();

  // Honeypot -- ya existía en el formulario (Contact.tsx original) pero
  // nunca se comprobaba en ningún sitio porque no había backend real.
  // Comprobación mínima, mismo criterio que Turnstile: si viene relleno,
  // es un bot, se rechaza sin gastar una llamada a Siteverify.
  if (formData.get("company")) {
    return NextResponse.json({ ok: false, message: "No se pudo enviar." }, { status: 400 });
  }

  const token = formData.get("cf-turnstile-response");
  if (!token || typeof token !== "string") {
    return NextResponse.json(
      { ok: false, message: "Verificación de seguridad no completada. Vuelve a intentarlo." },
      { status: 400 },
    );
  }

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return NextResponse.json({ ok: false, message: "No se pudo enviar. Inténtalo más tarde." }, { status: 500 });
  }

  const verifyBody = new URLSearchParams();
  verifyBody.set("secret", secret);
  verifyBody.set("response", token);
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) verifyBody.set("remoteip", forwardedFor.split(",")[0]!.trim());

  let verifyData: SiteverifyResponse;
  try {
    const verifyRes = await fetch(SITEVERIFY_URL, { method: "POST", body: verifyBody });
    verifyData = (await verifyRes.json()) as SiteverifyResponse;
  } catch {
    return NextResponse.json({ ok: false, message: "No se pudo verificar la solicitud. Inténtalo de nuevo." }, { status: 502 });
  }

  if (!verifyData.success) {
    return NextResponse.json(
      { ok: false, message: "No hemos podido verificar la solicitud. Inténtalo de nuevo." },
      { status: 400 },
    );
  }

  // No existe (todavía) un servicio real de envío de email/CRM en este
  // proyecto -- fuera del alcance pedido (punto 7 solo pide validar
  // Turnstile en servidor, no construir un backend de envío). El mensaje
  // queda validado pero no se persiste ni se reenvía a ningún sitio.
  return NextResponse.json({ ok: true, message: "Gracias, hemos recibido tu mensaje. Te responderemos en breve." });
}
