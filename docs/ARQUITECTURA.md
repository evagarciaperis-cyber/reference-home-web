# Arquitectura definitiva del ecosistema digital de Reference Home

**Estado:** APROBADA. Migración en curso.
**Proyecto definitivo:** `reference-home/` (carpeta hermana de `web-nueva/`, repo Git propio). Este documento vive también ahí, en `docs/ARQUITECTURA.md`, junto con `docs/MIGRACION.md` (roadmap de fases).
**`web-nueva/` y `comi/` se mantienen intactas como referencia** (oráculo de paridad visual/funcional) hasta que la migración esté completa y validada — no se eliminan hasta entonces.

## Decisiones aprobadas (resuelven la sección 19 original)

- **Hosting**: Vercel, para toda la web pública.
- **Framework**: Next.js (App Router) + TypeScript — confirmado como base definitiva.
- **CMS**: no se implementa todavía. La arquitectura (capa de adaptador, sección 2.4/15) queda preparada para conectarlo sin condicionar el resto.
- **Email transaccional**: no se implementa todavía. Se deja la arquitectura preparada (sección 2.5); el Route Handler del formulario de contacto se construye pero el envío real queda pendiente de proveedor.
- **Área privada**: no se desarrolla todavía. Queda preparada (sección 16) para incorporarse sin rehacer el proyecto.
- **Regla nº1, no negociable durante toda la migración**: paridad visual y funcional absoluta. Prohibido cambiar diseño, animaciones, timings, espaciados, tipografías o cualquier aspecto de la experiencia actual. Ver sección 18 ("Qué NO cambia").

---

## 0. Diagnóstico del estado actual

Antes de proponer nada, esto es lo que existe hoy, verificado directamente sobre el repositorio (`web-nueva`, rama `main`, paquete v2.5):

- **Sitio 100% estático**, sin build, sin `package.json`, sin framework. HTML plano + un único `assets/css/styles.css` (tokens en `:root`, reglas condensadas) + un único `assets/js/main.js` (483 líneas, vanilla JS en un IIFE).
- **Solo `index.html` está terminado** (378 líneas). El resto de páginas del sitemap previsto (`nosotros.html`, `proyectos.html`, `contacto.html`, `legales.html`, `proyectos/proyecto-0X.html`) existen como ficheros **vacíos** — son huecos en el enrutado, no páginas migrables.
- **`assets/css/pages.css` ya contiene el diseño completo de esas páginas interiores** (hero de página, galería "about", bloque de valores, grid de proyectos, ficha de caso, contacto, legal) aunque el HTML que las use todavía no se ha escrito. Es decir: la dirección de arte de todo el sitio ya está decidida en CSS, solo falta maquetarla.
- **El motor de animación es artesanal y muy preciso**: scroll-driven sticky sections con `requestAnimationFrame`, interpolación manual de progreso (`clamp((scrollY - start) / distance, 0, 1)`), custom properties CSS actualizadas por JS, `IntersectionObserver` para reveals, `matchMedia` para desactivar todo en `prefers-reduced-motion` y por debajo de 901px. No usa GSAP, ScrollTrigger, Framer Motion ni ninguna librería. Esto es una decisión de diseño deliberada y **debe tratarse como lógica de producto, no como código desechable**.
- **Backend**: un formulario de contacto que hace `fetch` a `send.php`, con `config.php` para el correo receptor. Requiere hosting compartido con PHP + `mail()`.
- **Despliegue**: manual por FTP a Apache (`.htaccess` presente), sin CI/CD, sin entornos de staging/producción diferenciados salvo por convención de carpetas (`/comi/` como ruta de la versión anterior).
- **Sin SEO real todavía**: `robots.txt` bloquea indexación a propósito ("mientras el proyecto siga siendo un estudio"), no hay sitemap, no hay metadatos por página, no hay datos estructurados.
- **Sin i18n, sin CMS, sin autenticación, sin tests, sin control de regresión visual.**

Este diagnóstico importa porque cambia el problema: no es una migración de un sitio grande y terminado, es la definición de la base **antes** de que la deuda de duplicación se materialice. Es el mejor momento posible para hacer este cambio — casi no hay nada que reescribir todavía, hay mucho que todavía no se ha construido dos veces.

---

## 1. Principio rector: paridad absoluta

Todo lo que sigue está subordinado a una regla: **ningún píxel, ningún timing, ninguna curva de easing cambia**. La arquitectura nueva es un contenedor distinto para el mismo comportamiento, no una reinterpretación.

Cómo se garantiza esto en la práctica (se detalla en el plan de migración, pero la arquitectura debe hacerlo posible):

1. **Congelar el estado actual como oráculo.** Antes de tocar nada, se capturan screenshots a varios anchos (375/768/1024/1440/1920) y vídeos de scroll de cada sección animada de `index.html` tal como está hoy. Esa captura es la referencia legal de "cómo se ve y se comporta".
2. **Puerto literal, no reescritura.** Los valores de `:root` (colores, fuentes, `--pad`, `--ease`) se trasladan como *design tokens* con los mismos nombres y mismos valores. Las fórmulas de `main.js` (easing cúbicos, umbrales `.07/.38`, `.31/.65`, `.58/.87`, multiplicadores como `1.085`, `.72`) se copian literalmente a funciones tipadas, no se "mejoran".
3. **Testing de regresión visual obligatorio antes de dar por buena cualquier fase.** Playwright + comparación de capturas contra el oráculo del punto 1, en desktop y mobile, con y sin `prefers-reduced-motion`. Una fase de migración no se considera cerrada si hay una sola diferencia de píxel no intencionada.
4. **Un solo dueño del CSS visual en cada momento.** Mientras dure la migración, el CSS "fuente de verdad" es siempre el actual; el nuevo sistema se valida contra él, nunca al revés.

---

## 2. Stack tecnológico definitivo

### 2.1 Framework: Next.js (App Router) + React + TypeScript

**Por qué cambiar de HTML estático a un framework:**

El requisito no es "una web", es "la base de un ecosistema" (web corporativa + propiedades + blog/CMS + área privada + herramientas internas) sostenido varios años. HTML estático puro no da respuesta a ninguno de esos puntos sin duplicar manualmente header, footer y CSS en cada nueva página — que es exactamente el problema que se quiere evitar. Se necesita: enrutado con layouts compartidos, renderizado orientado a SEO, capacidad de conectar un CMS con revalidación de contenido, y un lugar natural para autenticación y rutas privadas.

**Por qué Next.js frente a las alternativas:**

| Opción | Veredicto |
|---|---|
| **Next.js (App Router)** | Elegido. Renderizado híbrido (SSG para marketing, ISR para contenido de CMS, SSR/rutas dinámicas para área privada), `generateMetadata` para SEO por ruta, Route Handlers y Server Actions que sustituyen `send.php` sin salir del mismo proyecto, ecosistema maduro de auth (Auth.js) e i18n (`next-intl`), soporte nativo de imágenes/fuentes optimizadas. |
| Astro | Muy competitivo para sitios de contenido/SEO y hubiera sido la alternativa más cercana en filosofía (islas de interactividad, HTML mínimo por defecto). Se descarta porque el área privada y las futuras herramientas internas necesitarán mucha interactividad tipo aplicación, y ahí Next.js con React tiene mejor recorrido y más soporte del ecosistema (Auth.js, CMS headless, componentes). |
| Remix / React Router v7 | Buen framework, pero el ecosistema de Next.js (Vercel, CMS headless, `next/image`, `next-intl`) encaja mejor con el perfil de este proyecto (marketing + contenido + SEO) y reduce el número de piezas que hay que ensamblar a mano. |
| SPA (Vite + React, sin SSR) | Descartado de raíz: SEO es un requisito explícito y una SPA pura renderizada en cliente lo penaliza. |
| Seguir en HTML/CSS/JS estático, sin framework | Descartado: no resuelve la reutilización de header/footer/secciones, no da SSR/SSG para SEO, no tiene un camino limpio hacia CMS o área privada sin construir todo eso a mano. |

### 2.2 CSS: **no se sustituye el sistema actual, se traslada tal cual**

Esta es la decisión más importante del documento y va a contracorriente de lo habitual: **no se migra a Tailwind ni a un design system nuevo.**

Razón: el CSS actual ya es, de facto, un sistema de tokens (`:root` con colores, tipografías, `--pad` fluido, `--ease`) escrito a mano con mucho cuidado editorial (clamps, letter-spacing negativos calculados, aspect-ratios). Reescribirlo en utilidades de Tailwind obligaría a traducir cientos de declaraciones una por una, con riesgo real de introducir diferencias sutiles (exactamente lo que el requisito prohíbe) a cambio de un beneficio que aquí no aplica: Tailwind gana cuando el equipo compone diseño nuevo constantemente; aquí el diseño ya existe y hay que conservarlo intacto.

En su lugar:
- Los `:root` actuales se convierten en `src/ui/styles/tokens.css`, con los mismos nombres de variable.
- Cada componente migra su bloque de CSS actual a un **CSS Module** (`Componente.module.css`) con el mismo selector renombrado a `styles.xxx`, sin tocar valores.
- El reset y las reglas globales (`*`, `html`, `body`, `::selection`, `.noise`) pasan a `globals.css`.
- Tailwind queda descartado también para el futuro: mantener un único paradigma de estilos evita que conviva CSS "de autor" con utilidades, que es una fuente de inconsistencia a 5 años.

### 2.3 Animación: se traslada el motor propio, no se sustituye por una librería

`main.js` no es un conjunto de efectos genéricos: es un motor de scroll-driven animation hecho a medida con matemáticas específicas (progreso, easing, proximidad de tarjetas al centro del viewport, ángulo de la aguja de la brújula). Sustituirlo por GSAP/ScrollTrigger o Framer Motion sería exactamente el tipo de "reinterpretación" que el requisito prohíbe, y además introduciría una dependencia pesada para reproducir algo que ya funciona.

Decisión: se porta el motor a TypeScript como un **módulo propio** (`src/motion`, organizado desde ya como si fuera un futuro paquete independiente — ver sección 2.8), con:
- Un **core** de utilidades compartidas (ticker de `requestAnimationFrame`, cálculo de progreso `clamp((scrollY - start) / distance)`, `easeOutCubic`, `easeInOutCubic`, gestión de `matchMedia` y `prefers-reduced-motion`).
- Un **hook de React por feature**, cada uno réplica literal de su bloque actual: `useHorizontalGallery`, `useWorkZoom`, `useBrandStory`, `useParallax`, `useMagnetic`, `useCustomCursor`, `useRevealOnScroll`, `useSplitReveal`, `useCounter`.

GSAP/Framer Motion no quedan prohibidos para siempre — si dentro de un año se diseña una sección **nueva** (no una migración), puede evaluarse la herramienta más adecuada en ese momento. Lo que no se hace es usarlos para reproducir animación que ya existe.

### 2.4 Contenido y CMS: capa de adaptador, decisión de proveedor aplazada

No se ata el proyecto a un CMS concreto desde el primer día. Se define una interfaz de contenido (`src/content`) con funciones como `getProjects()`, `getPost(slug)`, `getProperty(slug)` que hoy leen de ficheros locales (Markdown/MDX + JSON, con Zod para validar el esquema) y el día que se conecte un CMS headless, solo cambia la implementación detrás de esa interfaz — ningún componente de UI sabe de dónde viene el contenido.

Cuando llegue el momento de decidir proveedor, la recomendación por defecto es **Sanity** (modelo de contenido muy flexible para algo tan heterogéneo como propiedades + blog + landing pages, buen soporte de preview e i18n) con **Payload CMS** como alternativa self-hosted si se prefiere no depender de un SaaS externo. Storyblok es una tercera opción válida si el equipo de contenido necesita edición visual in-context. Esta elección no bloquea nada de lo descrito aquí porque queda detrás del adaptador.

### 2.5 Formulario de contacto y backend simple

`send.php` se sustituye por un **Route Handler / Server Action** de Next.js que envía el correo con un proveedor transaccional (Resend, o Postmark/SendGrid si ya hay cuenta corporativa), manteniendo el mismo contrato de API (`POST`, `FormData`, respuesta `{ ok, message }`) que ya consume `main.js` — el frontend del formulario no cambia una línea de comportamiento.

### 2.6 Autenticación / área privada

**Auth.js (NextAuth v5)** sobre Next.js, con sesión gestionada por middleware que protege el route group `(privado)`. Preparado para email+password o SSO corporativo el día que haga falta, sin condicionar la estructura de rutas.

### 2.7 Infraestructura: cambio de hosting, marcado explícitamente como decisión a validar

Esto es lo único del documento que tiene una implicación operativa fuera del código: pasar de FTP + Apache + PHP compartido a un hosting con Node.js (**Vercel** es la recomendación por integración nativa con Next.js — ISR, preview deployments por PR, Edge Middleware; alternativa self-hosted: Node en un VPS/Docker detrás de Nginx si se prefiere no depender de Vercel). Esto implica:
- Dejar de desplegar por FTP manual; se pasa a Git como fuente de verdad y despliegue automático por push/PR.
- El dominio `referencehome.es` deberá apuntar al nuevo hosting cuando se haga el corte, coordinando DNS.
- El envío de correo deja de depender de `mail()` de PHP.

Esta pieza se retoma explícitamente en la sección 12 porque es la única decisión de esta lista que no es puramente técnica y que conviene confirmar contigo antes del plan de migración.

### 2.8 Un único proyecto Next.js, no un monorepo — con fronteras internas ya preparadas para extraerse

Revisado tras feedback: la primera versión de este documento proponía monorepo (pnpm workspaces + Turborepo) desde el día uno. Se descarta. Un monorepo resuelve un problema que hoy no existe — no hay una segunda app, no hay un segundo equipo, no hay nada que compartir entre dos consumidores reales todavía. Adoptarlo ahora es coste de coordinación (tooling, versionado interno, CI multi-paquete) a cambio de un beneficio hipotético. Se construye **un único proyecto Next.js**, y se le exige la misma disciplina de fronteras internas que tendría un monorepo, para que el día que haga falta extraer algo, sea un movimiento mecánico y no un rediseño.

Esto se consigue con tres reglas, no con herramientas adicionales:

1. **Módulos internos con la misma forma que tendrían como paquetes.** Dentro de `src/`, `ui/`, `motion/`, `content/` y `email/` están organizados exactamente como si ya fueran `packages/ui`, `packages/motion`, etc. — mismo contenido, mismos límites, solo que viven como carpetas de un mismo `package.json` en lugar de paquetes independientes.
2. **Dirección de dependencia de un solo sentido, forzada por lint.** `app/` puede importar de `ui/`, `motion/`, `content/` y `email/`. Ninguno de esos módulos puede importar de `app/`, ni entre sí salvo lo estrictamente necesario (p. ej. `ui` puede consumir `motion`, pero `content` no debería depender de `ui`). Se impone con una regla de ESLint (`import/no-restricted-paths` o `eslint-plugin-boundaries`), no solo con convención verbal — así un desarrollador nuevo no puede romperla sin que falle el lint.
3. **Alias de importación con nombre de paquete desde ya.** `tsconfig.json` define `@/ui/*`, `@/motion/*`, `@/content/*`, `@/email/*`. El código nunca usa rutas relativas largas entre módulos (`../../../motion/hooks/...`); usa el alias. El día de la extracción real a monorepo, el cambio es literalmente `@/motion` → `@reference-home/motion` en las importaciones y mover la carpeta — no tocar lógica.

La señal concreta para dar el salto a monorepo (`pnpm workspaces` + Turborepo, extrayendo `apps/web` y `apps/admin` como apps separadas y `ui`/`motion`/`content`/`email` como paquetes reales) es cuando exista una **segunda app real** que necesite estos módulos — por ejemplo, cuando se empiece a construir las herramientas internas (sección 17). Hasta entonces, un proyecto único es la arquitectura correcta, no una versión reducida de la correcta.

### 2.9 Calidad: testing y CI

- **Playwright**: regresión visual (obligatoria durante la migración, luego smoke tests de las interacciones críticas: scroll horizontal, zoom, formulario).
- **Vitest + Testing Library**: lógica pura (funciones de easing/progreso, adaptadores de contenido).
- **ESLint con regla de fronteras**: impide que `ui/`, `motion/`, `content/` o `email/` importen de `app/`, para mantener la dirección de dependencia descrita en 2.8.
- **GitHub Actions**: lint + typecheck + tests + build en cada PR; deploy automático a preview.

---

## 3. Estructura completa de carpetas

```
reference-home-web/                      # proyecto único Next.js
├── src/
│   ├── app/                             # App Router — solo rutas y composición, cero lógica reutilizable
│   │   ├── layout.tsx                   # <html>, providers globales, fonts, noise/cursor
│   │   ├── globals.css                  # reset + reglas globales (equivalente a la cabecera de styles.css)
│   │   ├── (marketing)/                 # route group: header/footer públicos
│   │   │   ├── layout.tsx               # Header + Footer + <main>
│   │   │   ├── page.tsx                 # / (home = index.html actual)
│   │   │   ├── nosotros/page.tsx
│   │   │   ├── proyectos/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [slug]/page.tsx      # ficha de proyecto (case-hero, case-content...)
│   │   │   ├── contacto/page.tsx
│   │   │   ├── legales/page.tsx
│   │   │   └── privacidad/page.tsx
│   │   ├── (propiedades)/               # futuro: listados, ficha de propiedad, buscador/mapa
│   │   │   └── propiedades/...
│   │   ├── (blog)/                      # futuro: blog editorial servido por el CMS
│   │   │   └── blog/...
│   │   ├── (privado)/                   # área privada, protegida por middleware
│   │   │   ├── layout.tsx
│   │   │   └── panel/...
│   │   ├── api/                         # Route Handlers (contacto, webhooks del CMS, auth)
│   │   ├── sitemap.ts
│   │   ├── robots.ts
│   │   └── not-found.tsx                # 404.html actual
│   │
│   ├── ui/                              # candidato a futuro package "ui" — sistema de componentes
│   │   ├── styles/
│   │   │   ├── tokens.css               # ex :root { --ink, --paper, --acid, --wine, --warm, --ease... }
│   │   │   └── reset.css
│   │   ├── primitives/                  # Button, CircleLink, MagneticWrapper, SectionLabel, Eyebrow...
│   │   ├── layout/                      # Header, Footer, MobileMenu, Preloader, CustomCursor, NoiseOverlay
│   │   └── sections/                    # Hero, Manifesto, Solutions, ProjectsGallery, WorkZoom,
│   │                                    # BrandStory, Principles, Stats, ContactForm
│   │
│   ├── motion/                          # candidato a futuro package "motion" — el motor de animación portado
│   │   ├── core/                        # ticker rAF, progress(), easing, reduced-motion, breakpoints
│   │   └── hooks/                       # useHorizontalGallery, useWorkZoom, useBrandStory,
│   │                                    # useParallax, useMagnetic, useCustomCursor,
│   │                                    # useRevealOnScroll, useSplitReveal, useCounter
│   │
│   ├── content/                         # candidato a futuro package "content" — adaptador de contenido
│   │   ├── schema/                      # Zod: Project, Post, Property, PageMeta
│   │   ├── local/                       # implementación actual (MDX/JSON en /content)
│   │   └── index.ts                     # getProjects(), getProject(slug), getPost(slug)...
│   │
│   ├── email/                           # candidato a futuro package "email" — sustituye send.php/config.php
│   │
│   └── middleware.ts                    # auth guard + i18n routing
│
├── content/                             # contenido editorial local (hasta que se conecte el CMS)
│   ├── proyectos/*.mdx
│   └── legal/*.mdx
│
├── public/                              # favicon, og-images estáticas, robots assets
├── e2e/                                 # Playwright: regresión visual + smoke tests
├── docs/                                # este documento y los que le sigan
├── .eslintrc / eslint.config.ts         # incluye la regla de fronteras entre app/ y ui|motion|content|email
├── tsconfig.json                        # alias @/ui, @/motion, @/content, @/email, @/app
├── next.config.ts
└── package.json
```

Nota deliberada: no hay `apps/` ni `packages/`. `src/app` es la única capa que sabe de rutas y composición de página; `ui/`, `motion/`, `content/` y `email/` son módulos con frontera propia — organizados y nombrados exactamente como se organizarían dentro de un monorepo, para que extraerlos el día que haga falta (sección 2.8) sea mover una carpeta y cambiar un alias, no rediseñar nada.

---

## 4. Sistema de layouts

Layouts anidados de App Router, cada uno responsable de una capa:

1. **`app/layout.tsx` (root)** — `<html lang>`, carga de fuentes, `NoiseOverlay`, `CustomCursor`, `Preloader`, providers (tema, analytics). Equivalente a las piezas globales que hoy están sueltas al principio de `<body>` en `index.html`.
2. **`app/(marketing)/layout.tsx`** — `Header` + `Footer` + `<main>`. El `Header` es un componente cliente con su propia lógica de estado (scroll, `on-dark`, menú móvil) que hoy vive en `main.js` como funciones globales (`updateHeader`, `darkSections`) — se convierte en un hook (`useHeaderState`) que observa las secciones marcadas como oscuras vía un `data-` attribute o contexto, igual que hoy hace `$$('.solutions, .process, .work-zoom, .contact, .site-footer')`.
3. **`app/(privado)/layout.tsx`** — layout distinto (sin el header/footer públicos), envuelto por el guard de autenticación.
4. **`app/(propiedades)/layout.tsx` y `app/(blog)/layout.tsx`** — reutilizan el layout de marketing (mismo header/footer) pero pueden añadir subnavegación propia (filtros de propiedades, categorías de blog) sin tocar el layout raíz.

Header y Footer **no se remontan entre páginas** dentro del mismo route group — es una de las mejoras reales que da el framework frente al HTML estático actual (hoy cada `.html` repetiría el `<header>` completo; en Next.js vive una sola vez).

---

## 5. Sistema de componentes reutilizables

Tres niveles, de menor a mayor composición:

- **Primitivos** (`src/ui/primitives`): `Button`, `CircleLink`, `SectionLabel`, `Eyebrow`, `MagneticWrapper` (envuelve el hook `useMagnetic`), `RevealText` (envuelve `useSplitReveal`/`useRevealOnScroll`). Sin conocimiento de negocio.
- **Layout** (`src/ui/layout`): `Header`, `Footer`, `MobileMenu`, `Preloader`, `CustomCursor`, `NoiseOverlay`. Un único punto de verdad para cada uno, usados en todas las páginas.
- **Secciones** (`src/ui/sections`): el mapeo directo de cada `<section>` de `index.html` a un componente — `Hero`, `Manifesto`, `Solutions` (el acordeón de servicios), `ProjectsGallery` (la galería horizontal con sticky scroll), `WorkZoom`, `BrandStory` (la brújula), `Principles`, `Stats`, `ContactForm`. Cada uno recibe contenido por props (título, texto, imágenes) para poder reutilizarse en variantes futuras sin duplicar la lógica de animación.

Regla de oro: **una sección = un componente = un hook de `src/motion` si tiene scroll-driven animation**. Nunca se reimplementa la misma animación dos veces para dos páginas distintas. `src/app` importa de `src/ui`, nunca al revés (regla de fronteras de la sección 2.8).

---

## 6. Gestión global de Header y Footer

Hoy el estado del header (`is-scrolled`, `is-hidden`, `on-dark`) se calcula leyendo el DOM directamente (`getBoundingClientRect` de secciones "oscuras" fijas por selector). En la nueva arquitectura:

- El `Header` sigue siendo un componente cliente (necesita `window.scrollY`), pero las secciones "oscuras" dejan de identificarse por lista de selectores hardcodeada y pasan a marcarse con una prop/atributo declarativo (`<Section tone="dark">`) en el propio componente de sección — así una sección nueva se integra en el cálculo del header por construcción, sin tocar `Header.tsx` ni una lista central que alguien puede olvidar actualizar.
- La lógica de scroll (throttle vía `rAF`, comparación con último scroll) se extrae a `useHeaderState()` en `src/motion`, testeable de forma aislada.
- El menú móvil (`MobileMenu`) es un componente separado que comparte el mismo estado de apertura vía un pequeño context (`HeaderMenuProvider`), reemplazando el `document.body.classList.toggle('no-scroll')` manual actual por un efecto controlado en React.

---

## 7. Organización de páginas

| Ruta actual (prevista) | Ruta nueva | Estado hoy |
|---|---|---|
| `index.html` | `app/(marketing)/page.tsx` | Completa — es el oráculo de paridad |
| `nosotros.html` | `app/(marketing)/nosotros/page.tsx` | Vacía; el diseño ya existe en `pages.css` (`.page-hero`, `.about-gallery`, `.statement-section`, `.values`) |
| `proyectos.html` | `app/(marketing)/proyectos/page.tsx` | Vacía; diseño en `.projects-page`, `.project-grid` |
| `proyectos/proyecto-0X.html` | `app/(marketing)/proyectos/[slug]/page.tsx` | Vacías; diseño en `.case-hero`, `.case-content`, `.case-gallery`, `.next-case` |
| `contacto.html` | `app/(marketing)/contacto/page.tsx` | Vacía; diseño en `.contact-page` |
| `legales.html` | `app/(marketing)/legales/page.tsx` | Vacía; diseño en `.legal-page` |
| `privacidad.html` | `app/(marketing)/privacidad/page.tsx` | Placeholder de un párrafo |
| `404.html` | `app/not-found.tsx` | Completa |
| — | `app/(propiedades)/**` | No existe todavía — módulo futuro |
| — | `app/(blog)/**` | No existe todavía — módulo futuro |
| — | `app/(privado)/**` | No existe todavía — módulo futuro |

Esto confirma algo importante: **casi todas las páginas "por migrar" en realidad no existen todavía**. No hay HTML legado que trasladar para `nosotros`, `proyectos`, `contacto`, `legales` ni las fichas de proyecto — solo hay que maquetarlas usando el CSS que ya está escrito en `pages.css`, directamente en la arquitectura nueva. La única migración de paridad estricta y con oráculo real es `index.html`.

---

## 8. Organización de secciones

Cada sección vive en `src/ui/sections/<Nombre>/` con esta forma consistente:

```
sections/ProjectsGallery/
├── ProjectsGallery.tsx        # marcado, recibe projects: Project[]
├── ProjectsGallery.module.css # CSS trasladado literalmente de .projects*
└── index.ts
```

La lógica de scroll (`useHorizontalGallery`) vive en `src/motion`, no dentro del componente — así una sección puede reutilizar un comportamiento (por ejemplo, una futura galería horizontal de propiedades destacadas) importando el mismo hook sin copiar matemática de scroll.

---

## 9. Organización de animaciones

`src/motion/`:

```
core/
├── ticker.ts          # requestAnimationFrame compartido, evita múltiples rAF loops compitiendo
├── progress.ts         # clamp((scrollY - start) / distance, 0, 1)
├── easing.ts            # easeOutCubic, easeInOutCubic — copiados literalmente
├── media.ts              # prefers-reduced-motion, breakpoint 901px (matchMedia), pointer:fine
└── measure.ts             # helpers de getBoundingClientRect + ResizeObserver + fonts.ready

hooks/
├── useHorizontalGallery.ts   # ex bloque "horizontalSection" (proyectos)
├── useWorkZoom.ts             # ex bloque "workZoom" (zoom a pantalla)
├── useBrandStory.ts            # ex bloque "brandStory" (brújula)
├── useParallax.ts               # ex [data-parallax]
├── useSplitReveal.ts             # ex [data-split-reveal]
├── useRevealOnScroll.ts           # ex [data-reveal] + IntersectionObserver
├── useCounter.ts                   # ex [data-count]
├── useMagnetic.ts                   # ex .magnetic
├── useCustomCursor.ts                # ex .cursor / [data-cursor]
└── useHeaderState.ts                  # ex updateHeader()
```

Cada hook expone exactamente el mismo contrato de entrada/salida que su bloque equivalente en `main.js` (mismos umbrales, mismas constantes numéricas), y se testea contra el oráculo visual, no se reescribe "a mejor".

---

## 10. Organización de estilos

- `src/ui/styles/tokens.css` — los `:root` actuales, mismos nombres (`--ink`, `--paper`, `--acid`, `--wine`, `--warm`, `--line`, `--sans`, `--serif`, `--pad`, `--ease`).
- `src/ui/styles/reset.css` — reglas globales (`*`, `html`, `body`, `img`, `button`, `::selection`).
- Un **CSS Module por componente**, con el bloque de reglas actual movido literalmente (renombrando el selector a clase local, sin tocar valores).
- `pages.css` se descompone en los CSS Modules de las secciones interiores (`PageHero`, `AboutGallery`, `StatementSection`, `Values`, `ProjectGrid`, `CaseHero`, `ContactPage`, `LegalPage`) siguiendo el mismo patrón.
- Los breakpoints se centralizan como constante compartida entre CSS y JS (901px es hoy un número mágico repetido en `main.js`; pasa a una única fuente, ej. `src/motion/core/media.ts`, importada también por un mixin/variable CSS).
- Sin Tailwind, sin CSS-in-JS en runtime (para no penalizar rendimiento ni SSR): CSS Modules puro, procesado por el propio Next.js.

---

## 11. Organización de assets

- SVGs actuales (`assets/images/*.svg`) pasan a `public/images/` tal cual — son ilustraciones vectoriales, no necesitan pipeline de optimización de imagen.
- El día que se incorporen fotografías reales (propiedades, casos reales), se sirven con `next/image` para optimización automática (formatos, tamaños responsive) sin cambiar la experiencia visual, ya que las reglas de `object-fit`/`aspect-ratio` ya están definidas en el CSS actual.
- Fuentes: hoy son fuentes de sistema (`Helvetica Neue`/`Georgia`), no hay ficheros que cargar. Si en el futuro se incorpora una fuente propia, se usa `next/font` para evitar layout shift, sin alterar el `line-height`/`letter-spacing` ya calibrados.
- Iconos (`favicon.svg`) y capturas de `preview/` se mantienen como material de referencia en `docs/`, no como parte del build de producción.

---

## 12. Estrategia SEO

- `generateMetadata()` por ruta (title, description, canonical, Open Graph, Twitter Card) — hoy solo existe un `<meta description>` genérico en `index.html`.
- `app/sitemap.ts` y `app/robots.ts` generados dinámicamente a partir de las rutas + contenido del CMS (proyectos, posts, propiedades), en vez del `robots.txt` estático actual que bloquea todo.
- Datos estructurados (JSON-LD): `Organization`/`LocalBusiness` en el layout raíz, `Article` en posts de blog, `RealEstateListing`/`Residence` en fichas de propiedad cuando exista ese módulo, `BreadcrumbList` en fichas de proyecto.
- Imágenes Open Graph generadas dinámicamente con `next/og` para cada proyecto/post/propiedad, en vez de una imagen OG genérica.
- Activar indexación (`robots.txt` actual) es una decisión de negocio, no técnica — se deja explícitamente fuera del código hasta que se apruebe el lanzamiento público.

---

## 13. Gestión de metadatos

Un tipo `PageMeta` en `src/content/schema` centraliza título, descripción, imagen OG y datos estructurados por tipo de contenido (página estática, proyecto, post, propiedad). Cada `page.tsx` exporta su metadata a partir de ese esquema; el contenido gestionado por CMS trae su propio metadata desde el adaptador, sin lógica SEO duplicada por página.

---

## 14. Preparación para internacionalización

- `next-intl` con segmento de ruta `[locale]` (`app/[locale]/(marketing)/...`), `es` como locale por defecto y estructura lista para añadir `en` u otros sin migrar rutas.
- Todos los textos actualmente hardcodeados en el HTML (`index.html`, `pages.css`'s HTML futuro) se extraen a diccionarios de mensajes (`messages/es.json`) durante la propia migración de paridad — no después, porque hacerlo después obliga a tocar cada componente dos veces.
- `hreflang` y `sitemap` alternates preparados desde el `generateMetadata`, aunque solo haya un idioma activo al principio.

---

## 15. Preparación para conectar un CMS

Ya cubierto en el punto 2.4: el patrón es **adaptador de contenido**. Lo que la arquitectura garantiza desde el día uno:

- Ningún componente de `src/ui` importa un cliente de CMS directamente; todos reciben props ya resueltas por `src/content`.
- Los esquemas de contenido (Zod) están definidos independientemente del proveedor, así que conectar Sanity/Payload/Storyblok más adelante es cambiar la implementación de `src/content/<provider>`, no el modelo de datos ni la UI.
- Revalidación por webhook (`app/api/revalidate/route.ts`) ya prevista como Route Handler, para que publicar en el CMS actualice la web sin redeploy manual (ISR on-demand).
- Modo preview de contenido no publicado, soportado de forma nativa por el App Router (`draftMode`), listo para cuando el CMS lo necesite.

---

## 16. Preparación para área privada

- Route group `app/(privado)` con su propio `layout.tsx`, protegido por `middleware.ts` que valida sesión de Auth.js antes de renderizar nada dentro del grupo.
- Estructura de roles/permisos (RBAC básico) prevista en el esquema de usuario desde el principio, aunque al lanzamiento inicial solo haya un rol.
- El área privada comparte `src/ui` (mismos tokens, misma tipografía) pero con su propio layout — no hereda el header/footer de marketing, evitando acoplar la experiencia pública con la de producto.

---

## 17. Preparación para futuras funcionalidades sin rehacer el proyecto

Esta es la prueba de estrés de toda la arquitectura: cómo entrarían las piezas mencionadas sin romper nada existente.

- **Propiedades**: nuevo route group `(propiedades)` + nuevo tipo de contenido en `src/content` (`Property`) + nuevas secciones en `src/ui/sections` (listado con filtros, ficha, posiblemente mapa) reutilizando primitivos y el mismo motor de scroll donde aplique (p. ej. una galería horizontal de propiedades destacadas reutiliza `useHorizontalGallery` tal cual). Todo dentro del mismo proyecto — no justifica por sí sola dar el salto a monorepo.
- **Blog**: `(blog)` route group + tipo `Post` en el adaptador de contenido + plantilla de artículo con MDX. SEO y sitemap ya contemplan este tipo desde el punto 12. Tampoco justifica monorepo.
- **Landing pages** puntuales (campañas): página suelta dentro de `(marketing)` componiendo secciones ya existentes de `src/ui`, sin nuevo código de infraestructura.
- **Herramientas internas**: este es el caso que sí justifica el salto descrito en 2.8. Cuando este módulo pase de idea a construcción real, es el momento de extraer `apps/web` + `apps/admin` y convertir `src/ui`, `src/motion`, `src/content`, `src/email` en paquetes de un pnpm workspace — mecánico gracias a las fronteras y alias ya existentes, sin rediseño. Hasta entonces, permanece fuera del proyecto (ni siquiera como carpeta vacía: no se crea andamiaje para algo que no existe).
- **Nuevas apps o subdominios** (p. ej. un configurador, un portal de partners): mismo criterio que herramientas internas — son la señal real de "ya hay una segunda app", que es cuando se justifica el monorepo, no antes.

---

## 18. Qué NO cambia (para que quede explícito)

- Ningún texto, ninguna copy.
- Ningún asset SVG, ninguna proporción (`aspect-ratio`), ningún `object-fit`.
- Ningún valor de `:root` (colores, `--pad`, `--ease`).
- Ninguna fórmula de animación: umbrales de scroll (`.07/.38`, `.31/.65`, `.58/.87`), multiplicadores (`1.085`, `.72`, `.235`), duraciones (`780ms` del preloader, `1300ms` del contador).
- El breakpoint de 901px que separa la experiencia desktop (scroll horizontal, zoom, brújula) de la experiencia vertical mobile/tablet.
- El comportamiento con `prefers-reduced-motion: reduce` (experiencia estática accesible).
- El contrato del formulario de contacto (`FormData` → JSON `{ ok, message }`) que consume `main.js`.

---

## 19. Decisiones — estado de resolución

1. **Hosting**: resuelto. Vercel.
2. **Proveedor de CMS**: pendiente, no bloquea la migración — se decide cuando se aborde la fase de CMS (posterior a la paridad completa).
3. **Proveedor de email transaccional**: pendiente, no bloquea la migración — el formulario se construye con el Route Handler preparado, envío real diferido.
4. **`/comi/` y `web-nueva/`**: se mantienen como referencia hasta paridad completa validada; se retiran solo entonces, con confirmación explícita.
5. **Alcance del área privada**: pendiente — no se desarrolla en esta fase, solo se deja la arquitectura preparada (sección 16).

---

## 20. Próximos pasos

Ver `docs/MIGRACION.md` en `reference-home/` para el roadmap de fases en ejecución. En líneas generales, el plan:

- Empiece por el andamiaje del proyecto Next.js único (con las fronteras de `src/ui`, `src/motion`, `src/content` y la regla de lint ya activas desde el primer commit) y el traslado de `index.html` (el único oráculo real de paridad) con verificación de regresión visual en cada sección migrada.
- Continúe con la maquetación de `nosotros`, `proyectos`, `contacto`, `legales` y fichas de proyecto **directamente en la arquitectura nueva**, usando el diseño ya definido en `pages.css` (no hay HTML legado que migrar ahí, así que no hay riesgo de duplicar trabajo).
- Dedique una fase explícita a extraer textos a diccionarios de i18n en el momento de la migración, no después.
- Deje CMS, propiedades, área privada y herramientas internas como fases posteriores e independientes, una vez la base esté desplegada y validada en producción con paridad confirmada.
