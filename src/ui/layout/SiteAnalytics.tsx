import Script from "next/script";

// Analítica de la portada estática que se sube a referencehome.es
// (NEXT_PUBLIC_EXPORT_HOME=1, scripts/export-home.mjs). Es la misma que llevan
// las páginas de Joomla, el valorador y las herramientas: Google Analytics 4
// (G-48NRBZEH97) y Google Tag Manager (GTM-T2RPXHR2), que también gestiona el
// aviso de cookies. En las vistas previas de Vercel no se carga.
const GA_ID = "G-48NRBZEH97";
const GTM_ID = "GTM-T2RPXHR2";

export function SiteAnalytics() {
  if (process.env.NEXT_PUBLIC_EXPORT_HOME !== "1") return null;
  return (
    <>
      <Script id="gtm" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`}
      </Script>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga4" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=window.gtag||gtag;gtag('js',new Date());gtag('config','${GA_ID}',{content_group:'home'});`}
      </Script>
      <noscript>
        <iframe src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`} height="0" width="0" style={{ display: "none", visibility: "hidden" }} title="Google Tag Manager" />
      </noscript>
    </>
  );
}
