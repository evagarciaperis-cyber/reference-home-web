# Plan de migración por fases

Referencia: `docs/ARQUITECTURA.md`. Oráculo de paridad: `../web-nueva/index.html` (+ `assets/css/styles.css`, `assets/js/main.js`) y `../web-nueva/404.html`, sin tocar.

**Regla nº1, válida para cada fase sin excepción:** ningún cambio de diseño, animación, timing, espaciado, tipografía o comportamiento. Solo cambia la arquitectura interna.

**Ciclo obligatorio por fase:** implementación → comparación con la web actual → corrección de diferencias → validación de paridad → commit → push. No se avanza a la siguiente fase sin paridad completa en la actual.

## Estado

| # | Fase | Estado |
|---|---|---|
| 0 | Andamiaje del proyecto Next.js | ✅ Hecho |
| 1 | Herramientas de regresión visual | Siguiente |
| 2 | Shell global: layout raíz, NoiseOverlay, CustomCursor, Preloader | Pendiente |
| 3 | Header + MobileMenu (`useHeaderState`) | Pendiente |
| 4 | Sección Hero | Pendiente |
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

## Fase 1 — Herramientas de regresión visual (siguiente)

Sin esto, el paso "comparación con la web actual" de cada fase posterior no es verificable de forma objetiva. Antes de tocar una sola sección visual:

- Instalar Playwright (`@playwright/test`) como devDependency.
- Script que sirve `web-nueva/` en estático (oráculo) y captura capturas de referencia por viewport (375/768/1024/1440/1920) de `index.html`, con y sin `prefers-reduced-motion`.
- Script equivalente para el proyecto nuevo en `npm run dev`, mismos viewports.
- Carpeta `e2e/` con el setup y un primer test trivial (compara dos capturas idénticas) para confirmar que el pipeline funciona antes de depender de él.

## Notas de alcance por fase visual (4–13)

- Cada sección migra a `src/ui/sections/<Nombre>/` (componente + CSS Module, ver `ARQUITECTURA.md` sección 8).
- Cada animación scroll-driven migra a un hook de `src/motion/hooks/` con el mismo contrato numérico que su bloque en `main.js` (umbrales, easing, multiplicadores — ver `ARQUITECTURA.md` sección 9). El *core* compartido (`ticker`, `progress`, `easing`, `media`) se construye en la fase que primero lo necesite (Header, fase 3) y se reutiliza después.
- Las fases 7, 9 y 10 (ProjectsGallery, WorkZoom, BrandStory) son las de mayor riesgo de divergencia — llevan la matemática de scroll más compleja de `main.js`. Se tratan con más cautela y, si hace falta, se subdividen en sub-fases al llegar a ellas.
- El formulario de contacto (fase 13) migra su contrato `FormData` → JSON `{ ok, message }` a un Route Handler; el envío real de correo queda pendiente del proveedor de email transaccional (decisión aplazada), documentado como hueco conocido, no oculto.
