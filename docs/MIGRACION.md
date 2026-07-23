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
| 4 | Sección Hero | ✅ Hecho |
| 5 | Sección Manifesto | ✅ Hecho |
| 6 | Sección Solutions (acordeón de servicios) | Siguiente |
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

## Fase 4 — Hero (hecho)

- `useMagnetic` (nuevo hook) + `PreloaderProvider` (nuevo, en `src/motion/`): el estado `ready` del preloader se calcula una sola vez y se comparte por contexto entre `Preloader` y `Hero` — viven en partes distintas del árbol (layout raíz vs. `page.tsx`) sin padre común cercano, así que sin esto habría dos temporizadores independientes calculando lo mismo.
- `Hero`: puerto literal de la sección `.hero` (orb, topline, título con revelación escalonada vía CSS puro, footer con el círculo "Explorar" magnético, servicios). `page.tsx` deja de ser el placeholder de la Fase 0.
- **`npm run parity:check` pasa a 0.000% exacto en los 7 viewports** — no solo "sin regresiones": con Header+Hero siendo hoy toda la home, la paridad completa de la página coincide con el oráculo. No estaba previsto llegar a esto en esta fase (se esperaba que siguiera en rojo hasta cerrar más secciones), pero es el resultado real.
- **Tres correcciones de herramientas encontradas al haber por primera vez contenido y animaciones reales** (commits separados, mismo patrón que la corrección de la Fase 2): `settle()` esperaba un selector (`.hero.is-ready`) que solo existe con ese nombre en el oráculo, nunca en CSS Modules; la lista de animaciones en bucle a neutralizar tenía el mismo problema (`.hero__orb` nunca coincidía en el proyecto nuevo — causaba una regresión real de determinismo, confirmada por el propio test de "captura determinista"); y el `threshold` de color por píxel de `pixelmatch` era demasiado estricto para el ruido de antialiasing sub-píxel real entre HTML estático y DOM hidratado por React (diagnosticado a fondo: estilos computados y bounding rects idénticos byte a byte, diferencia cae a 0px exacto a partir de threshold 0.25). Un cuarto ajuste corrigió el elemento de prueba del cursor (Fase 2), que un elemento real del Hero podía interceptar.
- **Limitación de entorno encontrada y documentada, no oculta**: `reducedMotion:'reduce'` de Playwright no se aplica realmente al navegador cuando los tests se lanzan vía `npx playwright test` en este entorno (confirmado con `matchMedia` devolviendo `false` incluso en `about:blank`, pese a que la configuración del proyecto es correcta). Verificado por separado que el mecanismo CSS en sí es correcto (reproducido con éxito fuera del test runner). Dos tests quedan explícitamente saltados con el diagnóstico completo en el propio código en vez de dar un falso positivo.
- 143 tests en verde (3 ejecuciones seguidas), 67 skips documentados.

## Fase 5 — Manifesto (hecho)

- `useSplitReveal` y `useParallax` (nuevos hooks): puerto literal de `[data-split-reveal]` y `[data-parallax]` de `main.js`. Ninguno de los dos comprueba `prefers-reduced-motion` — el original tampoco lo hace en estos dos bloques (a diferencia de cursor/magnetic). Mismo patrón de atributos `data-*` para desacoplar el hook de los nombres de clase de CSS Modules (`data-word`/`data-visible`) que `data-loop-anim` (fase 4) y `data-header-tone` (fase 3).
- `SectionLabel` y `Eyebrow` (nuevos primitivos): ya previstos en `docs/ARQUITECTURA.md` sección 5; Manifesto es su primer consumidor real. `SectionLabel` lo reutilizarán Solutions/Projects/Process/Work-Zoom/Principles/Contact en fases futuras.
- `Manifesto`: puerto literal de la sección `.manifesto`. El padding compartido de `.section` (6+ secciones en el original) se fusiona en `.manifesto` por ser hoy su único consumidor — se extrae a un primitivo cuando una segunda sección lo necesite.
- **Bug real encontrado y corregido antes de comitear**: el original une sus `<span class="word">` con `join(' ')`, insertando un espacio real entre ellos; `.map()` de React no lo hace por sí solo — las palabras aparecían pegadas sin espacios en la vista móvil. Corregido con `flatMap` intercalando un espacio de texto.
- **`npm run parity:check` se mantiene en 0.000% exacto en los 7 viewports** para la home completa (sin regresiones en Header/MobileMenu/Shell/Hero) — Manifesto está fuera del viewport inicial (Hero es `min-height:100svh`), así que no afecta a esa comparación; su propia paridad se valida con un oráculo dedicado que hace scroll instantáneo hasta `#estudio` antes de capturar, también en 0.000% exacto en los 5 viewports con oráculo.
- 211 tests en verde (3 ejecuciones seguidas), 69 skips documentados.

## Notas de alcance por fase visual (4–13)

- Cada sección migra a `src/ui/sections/<Nombre>/` (componente + CSS Module, ver `ARQUITECTURA.md` sección 8).
- Cada animación scroll-driven migra a un hook de `src/motion/hooks/` con el mismo contrato numérico que su bloque en `main.js` (umbrales, easing, multiplicadores — ver `ARQUITECTURA.md` sección 9). El *core* compartido (`ticker`, `progress`, `easing`, `media`) se construye en la fase que primero lo necesite (Header, fase 3) y se reutiliza después.
- Las fases 7, 9 y 10 (ProjectsGallery, WorkZoom, BrandStory) son las de mayor riesgo de divergencia — llevan la matemática de scroll más compleja de `main.js`. Se tratan con más cautela y, si hace falta, se subdividen en sub-fases al llegar a ellas.
- El formulario de contacto (fase 13) migra su contrato `FormData` → JSON `{ ok, message }` a un Route Handler; el envío real de correo queda pendiente del proveedor de email transaccional (decisión aplazada), documentado como hueco conocido, no oculto.
