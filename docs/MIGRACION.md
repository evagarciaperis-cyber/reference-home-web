# Plan de migración por fases

Referencia: `docs/ARQUITECTURA.md`. Oráculo de paridad: `../web-nueva/index.html` (+ `assets/css/styles.css`, `assets/js/main.js`) y `../web-nueva/404.html`, sin tocar.

**Regla nº1, válida para cada fase sin excepción:** ningún cambio de diseño, animación, timing, espaciado, tipografía o comportamiento. Solo cambia la arquitectura interna.

**Ciclo obligatorio por fase:** implementación → comparación con la web actual → corrección de diferencias → validación de paridad → commit → push. No se avanza a la siguiente fase sin paridad completa en la actual.

**Granularidad:** si al implementar una fase resulta más grande de lo previsto, se divide en subfases antes de seguir — mejor 20 fases pequeñas que 10 demasiado grandes.

## Estado

| # | Fase | Estado |
|---|---|---|
| 0 | Andamiaje del proyecto Next.js | ✅ Hecho |
| 1 | Oráculo de paridad visual (Playwright) | ✅ Hecho |
| 2 | Shell global: layout raíz, NoiseOverlay, CustomCursor, Preloader | ✅ Hecho |
| 3 | Header + MobileMenu (`useHeaderState`) | ✅ Hecho |
| 4 | Sección Hero | Siguiente |
| 5 | Sección Manifesto | Pendiente |
| 6 | Sección Solutions (acordeón de servicios) | Pendiente |
| 7 | Sección ProjectsGallery (scroll horizontal sticky) | Pendiente |
| 8 | Sección Process | Pendiente |
| 9 | Sección WorkZoom (zoom a pantalla) | Pendiente |
| 10 | Sección BrandStory (brújula) | Pendiente |
| 11 | Sección Principles | Pendiente |
| 12 | Sección Stats (contadores) | Pendiente |
| 13 | Sección Contact (formulario) + Footer | Pendiente |
| 14 | Página 404 | Pendiente |
| 15 | Metadata SEO base para lo migrado (home) + sitemap/robots | Pendiente |
| 16 | Regresión visual consolidada de la home completa (mobile + desktop + reduced-motion) | Pendiente |

Al cerrar la fase 16, `index.html` y `404.html` tienen paridad completa en la nueva arquitectura — ese es el hito de "migración de paridad estricta" cerrado. A partir de ahí:

- **Páginas interiores nuevas** (`nosotros`, `proyectos`, `contacto` standalone, `legales`, fichas de proyecto): no son migración de paridad — hoy son ficheros vacíos en `web-nueva`. Se maquetan directamente en la arquitectura nueva usando el diseño ya definido en `web-nueva/assets/css/pages.css`. Se planifican como su propio bloque de fases cuando llegue el momento.
- **i18n, CMS, email transaccional, área privada, propiedades, blog**: fases independientes y posteriores, según lo acordado (`ARQUITECTURA.md`, decisiones aprobadas).
- Solo cuando todo lo anterior esté migrado y validado se retira `web-nueva/` y `comi/`.

## Fase 0 — Andamiaje (hecho)

- Proyecto Next.js 16 (App Router) + TypeScript, sin Tailwind, `src/` + alias `@/*`.
- Reglas de fronteras en ESLint (`eslint.config.mjs`): `ui/motion/content/email` no importan de `app`; `content` no importa de `ui`.
- `src/ui/styles/tokens.css` y `reset.css`: puerto literal del bloque `:root` y las reglas base de `web-nueva/assets/css/styles.css`.
- `globals.css`, `layout.tsx` y `page.tsx` reducidos a placeholder de andamiaje (el Home real llega en las fases 2–13).
- Verificado: `npm run lint` y `npm run build` limpios.

## Fase 1 — Oráculo de paridad visual (hecho)

- `e2e/oracle/*.png`: 7 capturas congeladas y **comiteadas** de `web-nueva/index.html` (viewports 375/768/1024/1440/1920 + variantes `mobile-375-reduced`/`desktop-1440-reduced` con `prefers-reduced-motion`). Generadas con `npm run parity:update-oracle`, que lee `web-nueva/` vía `file://` — solo hace falta en el equipo donde se regenera el oráculo, nunca en CI/despliegue: de ahí en adelante todo se compara contra los PNG ya comiteados.
- `npm run parity:check` (Playwright): arranca el proyecto en modo producción (`next build && next start`), navega a cada ruta/viewport, compara píxel a píxel contra el oráculo (`pixelmatch`) y falla si supera el 0.1% de diferencia. Adjunta la imagen de diff al reporte HTML (`npm run parity:report`).
- `e2e/utils/settle.ts` neutraliza las animaciones CSS en bucle infinito (`hero__orb`, `work-zoom__scroll`, `brand-story__caption`) antes de capturar, para que dos capturas del mismo estado sean deterministas sin recortar las transiciones de entrada (preloader → hero), que se esperan de forma natural.
- Validado en ambas direcciones sobre el placeholder actual: el test de determinismo pasa en los 7 viewports (0% de diferencia) y el test de paridad falla correctamente con 84–92% de diferencia frente al oráculo — confirma que la herramienta detecta diferencias reales antes de depender de ella.
- **Uso obligatorio de aquí en adelante**: ninguna fase visual (2–16) se da por cerrada sin `npm run parity:check` en verde para las rutas/secciones que esa fase cubre.

## Fase 2 — Shell global (hecho)

- `src/motion/core/media.ts` (`prefersReducedMotion`, `canHover`) y `src/motion/hooks/{usePreloader,useCustomCursor}.ts`: puerto literal de los bloques correspondientes de `main.js`, con el mismo contrato numérico (delay 780ms/0ms, lerp 0.18).
- `src/ui/layout/{Preloader,NoiseOverlay,CustomCursor}/`: componentes autocontenidos (componente + CSS Module con los valores de `styles.css` sin modificar + `index.ts`), montados en `src/app/layout.tsx` antes de `{children}`.
- `usePreloader` expone un booleano reutilizable pensado para que el Hero (fase 4) lo consuma también, sin que Preloader tenga que tocar el DOM de Hero directamente (en el original, el mismo `setTimeout` cambia las dos clases a la vez).
- `useCustomCursor` usa delegación de eventos (`document` + `closest('[data-cursor]')`) en vez de la consulta única del script original, para que funcione con elementos `data-cursor` que añadan componentes futuros sin tener que revisar este hook otra vez.
- `e2e/shell.spec.ts` + `e2e/oracle/preloader-*.png`: valida el shell de forma aislada, sin depender de que la home esté migrada (el Preloader es pantalla completa y opaca, cubre cualquier contenido detrás). 26 tests en verde, 2 saltados con motivo documentado (reduced-motion no tiene un instante estable que capturar).
- `npm run parity:check` (paridad completa de la home) sigue en rojo, como se esperaba — el body aún no tiene contenido, así que se ve el fondo `html{background:var(--ink)}` en vez de `body{background:var(--paper)}`; ambos valores son correctos y están portados desde la Fase 0, es solo que nada ocupa el body todavía. Se resuelve solo al migrar Header/Hero (fases 3–4).
- **Corrección posterior** (al preparar la Fase 3): faltaban dos reglas responsive/reduced-motion de `styles.css` que no se habían leído completas — el override global `*,*:before,*:after{transition-duration:.01ms!important}`/`html{scroll-behavior:auto}` (→ `reset.css`), `.preloader{display:none}` bajo reduced-motion (→ `Preloader.module.css`, garantía puramente CSS independiente del timing de hidratación) y `.cursor{display:none}` en `@media(max-width:640px)` (→ `CustomCursor.module.css`). De paso se corrigió una condición de carrera preexistente en el test de hover del cursor (no esperaba a que el preloader terminara su salida). Commit `98b84fd`.

## Fase 3 — Header, navegación principal, MobileMenu (hecho)

- `useHeaderState`: puerto literal de `updateHeader()` (umbrales 20px/500px/44px). La lista fija de selectores "oscuros" del original se sustituye por un atributo declarativo `data-header-tone="dark"` (`docs/ARQUITECTURA.md`, sección 6): ninguna sección lo usa todavía, así que hoy el header nunca entra en estado `on-dark` — se activará solo cuando cada sección oscura se migre y se marque a sí misma, sin volver a tocar este hook.
- `Header`, `MobileMenu`, `SiteHeader`: componentes independientes; `SiteHeader` es el único dueño del estado de apertura compartido y del bloqueo de scroll del body (antes `document.body.classList.toggle('no-scroll')` manual). Montados en el layout raíz por ahora (única superficie existente); el comentario en `layout.tsx` deja anotado el traslado a `app/(marketing)/layout.tsx` cuando exista ese route group.
- Validación de paridad de píxel con dos estrategias distintas según el tipo de elemento: el header (transparente por defecto) se aísla ocultando todo lo demás y forzando un fondo plano idéntico en oráculo y proyecto nuevo (`isolateHeader()`); el menú móvil (capa opaca a pantalla completa) se compara directamente, igual que el Preloader en la Fase 2.
- `e2e/header.spec.ts` cubre además el comportamiento pedido explícitamente: escritorio/móvil, apertura/cierre, bloqueo de scroll, hover (subrayado del nav), foco por teclado, y que los enlaces apunten a las rutas correctas. Al no existir contenido real todavía, se usa un espaciador sintético para poder probar `isScrolled`/`isHidden` con scroll real.
- 84 tests en verde (3 ejecuciones seguidas para descartar inestabilidad), 38 skips documentados (combinaciones viewport/escritorio-móvil que no aplican).

## Notas de alcance por fase visual (4–13)

- Cada sección migra a `src/ui/sections/<Nombre>/` (componente + CSS Module, ver `ARQUITECTURA.md` sección 8).
- Cada animación scroll-driven migra a un hook de `src/motion/hooks/` con el mismo contrato numérico que su bloque en `main.js` (umbrales, easing, multiplicadores — ver `ARQUITECTURA.md` sección 9). El *core* compartido (`ticker`, `progress`, `easing`, `media`) se construye en la fase que primero lo necesite (Header, fase 3) y se reutiliza después.
- Las fases 7, 9 y 10 (ProjectsGallery, WorkZoom, BrandStory) son las de mayor riesgo de divergencia — llevan la matemática de scroll más compleja de `main.js`. Se tratan con más cautela y, si hace falta, se subdividen en sub-fases al llegar a ellas.
- El formulario de contacto (fase 13) migra su contrato `FormData` → JSON `{ ok, message }` a un Route Handler; el envío real de correo queda pendiente del proveedor de email transaccional (decisión aplazada), documentado como hueco conocido, no oculto.
