import Script from "next/script";

// Analítica de la portada estática que se sube a referencehome.es
// (NEXT_PUBLIC_EXPORT_HOME=1, scripts/export-home.mjs), con consentimiento (Consent Mode v2, MODO BÁSICO):
// - Google Analytics (gtag.js) solo se carga si el visitante acepta, ahora o en una visita anterior
//   (localStorage «rh_consent», la misma elección que el blog, el valorador y Joomla).
// - El aviso de cookies es el común de la web: /herramientas/cookies.js, que llama a window.rhLoadGA al aceptar.
// - 2026-11-11: sin Google Tag Manager (el contenedor GTM-T2RPXHR2 está vacío).
// En las vistas previas de Vercel no se carga.
const GA_ID = "G-48NRBZEH97";

const CONSENT = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=window.gtag||gtag;
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',functionality_storage:'granted',security_storage:'granted',wait_for_update:500});
gtag('set','url_passthrough',true);
window.rhLoadGA=function(){if(window.__rhGA)return;window.__rhGA=true;var s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id=${GA_ID}';document.head.appendChild(s);gtag('js',new Date());gtag('config','${GA_ID}',{content_group:'home'});};
(function(){try{var c=JSON.parse(localStorage.getItem('rh_consent')||'null');if(c&&c.v===1&&(Date.now()-c.t)<182*864e5){window.RH_CONSENT_DONE=true;if(c.ok){gtag('consent','update',{ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted',analytics_storage:'granted'});window.rhLoadGA();}}}catch(e){}})();`;

export function SiteAnalytics() {
  if (process.env.NEXT_PUBLIC_EXPORT_HOME !== "1") return null;
  return (
    <>
      <Script id="ga4-consent" strategy="afterInteractive">
        {CONSENT}
      </Script>
      <Script src="/herramientas/cookies.js?v=2" strategy="afterInteractive" />
    </>
  );
}
