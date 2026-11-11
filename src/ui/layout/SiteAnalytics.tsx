import Script from "next/script";

// Analítica de la portada estática que se sube a referencehome.es
// (NEXT_PUBLIC_EXPORT_HOME=1, scripts/export-home.mjs), con consentimiento (Consent Mode v2):
// - Todo empieza denegado; si el visitante ya eligió (localStorage «rh_consent», el mismo del
//   blog, el valorador y Joomla), se aplica su elección antes de medir.
// - El aviso de cookies es el común de la web: /herramientas/cookies.js.
// - 2026-11-11: sin Google Tag Manager (el contenedor GTM-T2RPXHR2 está vacío y se cargaba antes
//   del consentimiento). Solo Google Analytics 4 (G-48NRBZEH97).
// En las vistas previas de Vercel no se carga.
const GA_ID = "G-48NRBZEH97";

const CONSENT = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=window.gtag||gtag;
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',functionality_storage:'granted',security_storage:'granted',wait_for_update:500});
gtag('set','url_passthrough',true);
(function(){try{var c=JSON.parse(localStorage.getItem('rh_consent')||'null');if(c&&c.v===1&&(Date.now()-c.t)<182*864e5){var g=c.ok?'granted':'denied';gtag('consent','update',{ad_storage:g,ad_user_data:g,ad_personalization:g,analytics_storage:g});window.RH_CONSENT_DONE=true;}}catch(e){}})();
gtag('js',new Date());gtag('config','${GA_ID}',{content_group:'home'});`;

export function SiteAnalytics() {
  if (process.env.NEXT_PUBLIC_EXPORT_HOME !== "1") return null;
  return (
    <>
      <Script id="ga4-consent" strategy="afterInteractive">
        {CONSENT}
      </Script>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script src="/herramientas/cookies.js?v=1" strategy="afterInteractive" />
    </>
  );
}
