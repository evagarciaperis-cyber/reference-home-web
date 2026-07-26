# Paleta corporativa de Reference Home — auditoría y propuesta de tokens

**Estado:** ✅ Dirección cromática **aprobada** (2026-07-25, tras revisión del Color Proof). **Implementación aplazada a propósito** — no se traduce a `tokens.css` todavía. Ver sección 8.
**Fecha:** 2026-07-25.
**Precede a:** cualquier cambio visual de sección — es un documento de sistema, no de composición. Se relaciona con `docs/REFERENCE_HOME_HOME_REDESIGN_MASTERPLAN.md` (sección 10, "Reglas de color") pero lo desarrolla a nivel de token técnico, que aquí sí importa nombrar con precisión porque de aquí saldrá `tokens.css`.

---

## 1. Auditoría del sistema cromático actual

`src/ui/styles/tokens.css` es hoy la única fuente de verdad de color del proyecto — 69 usos en 18 archivos, sin ningún otro `:root` alternativo. Son los tokens heredados literalmente de `web-nueva/` durante la migración de paridad:

| Token actual | Valor | Rol hoy |
|---|---|---|
| `--ink` | `#11110f` | Texto principal / fondo de secciones oscuras (Process, WorkZoom, Contact previo al granate) |
| `--paper` | `#ece9e1` | Fondo principal (crema neutro) |
| `--acid` | `#e7ff48` | Acento pleno único (Principles) |
| `--wine` | `#8f173f` | Acento pleno único (Contact) |
| `--warm` | `#c9b8aa` | Tono cálido secundario, uso puntual |
| `--line` / `--line-light` | `rgba(17,17,15,.18)` / `rgba(255,255,255,.2)` | Bordes sobre fondo claro / oscuro |

**Hallazgo 1 — el sistema de tokens en sí está sano.** No hay un segundo origen de color compitiendo; todo el proyecto lee de aquí. Sustituir estos seis valores por la paleta corporativa es, técnicamente, un cambio contenido y de bajo riesgo de regresión estructural.

**Hallazgo 2 — hay color fuera del sistema de tokens.** 27 valores hexadecimales están escritos directamente en `WorkZoom.module.css`, `BrandStory.module.css`, `Solutions.module.css` y `ProjectsGallery.module.css` (gradientes y tonos de los mockups de dispositivo — `#d8d1c6`, `#651735`, `#292927`, etc.). Sin excepción, todos pertenecen a las maquetas de proyecto ficticio que el masterplan ya marca para sustitución completa por fotografía real (`REFERENCE_HOME_HOME_REDESIGN_MASTERPLAN.md`, secciones 5 y 9). **No se proponen tokens nuevos para estos valores** — desaparecerán con las maquetas cuando se sustituyan por trabajo real, y tokenizarlos ahora sería fijar en el sistema un color que ya sabemos que se va.

**Hallazgo 3 — no existe hoy ningún verde ni ningún dorado en la paleta.** `--acid` (amarillo-verde ácido) es lo más cercano a un tono cálido secundario, pero cromáticamente no es ni el verde agua ni el dorado mostaza de la paleta corporativa — es un color distinto que esta propuesta retira.

---

## 2. Paleta corporativa recibida

| Nombre | Hex | Rol asignado por el usuario |
|---|---|---|
| Rojo vino | `#A11F48` | Pilar de identidad (junto con crema) |
| Crema | `#F0DFCF` | Pilar de identidad (junto con vino) |
| Verde grisáceo profundo | `#4A5D5A` | Contraste sofisticado |
| Verde agua | `#85B1B4` | Uso puntual y controlado |
| Dorado mostaza | `#F4C542` | Uso puntual y controlado |

---

## 3. Propuesta de tokens globales

| Categoría | Token propuesto | Valor | Sustituye a | Uso |
|---|---|---|---|---|
| Fondo principal | `--color-bg-primary` | `#F0DFCF` (crema) | `--paper` | Fondo por defecto de las secciones de calma/lectura (Hero, Manifesto, Valoración, Solutions cerrado, Proyectos). |
| Fondo alternativo | `--color-bg-secondary` | `#4A5D5A` (verde grisáceo profundo) | — (nuevo) | Fondo oscuro de marca para secciones de intensidad media (Footer, tramos de BrandStory) — reemplaza al negro genérico por un oscuro con firma propia. Ver advertencia 4.1 sobre su relación con `--ink`. |
| Fondo de máxima inmersión | `--ink` (se mantiene) | `#11110f` | — (se conserva) | Reservado en exclusiva para el único pico de intensidad del recorrido (WorkZoom) y para texto principal sobre fondo claro. No se usa como fondo por defecto de ninguna otra sección. |
| Superficie sobre fondo claro | `--color-surface-light` | `#F7ECE2` | — (nuevo) | Tarjetas, paneles e inputs elevados sobre `--color-bg-primary` — un paso más claro que el fondo, sin introducir un color nuevo. |
| Superficie sobre fondo oscuro | `--color-surface-dark` | `#5C6E6B` | — (nuevo) | Tarjetas y paneles elevados sobre `--color-bg-secondary` — un paso más claro que ese fondo, misma familia cromática. |
| Texto principal (sobre claro) | `--color-text-primary` | `#11110F` (ink) | `--ink` | Cuerpo de texto y titulares sobre crema/superficie clara. |
| Texto principal (sobre oscuro) | `--color-text-primary-inverse` | `#F0DFCF` (crema) | — (nuevo, antes se resolvía ad hoc) | Cuerpo de texto y titulares sobre verde grisáceo / ink / vino. |
| Texto secundario (sobre claro) | `--color-text-secondary` | `#4A5D5A` (verde grisáceo profundo) | — (nuevo) | Subtítulos, leyendas, texto de apoyo sobre crema — con identidad, no un gris neutro genérico. |
| Texto secundario (sobre oscuro) | `--color-text-secondary-inverse` | `#F0DFCF` a 72% de opacidad | — (nuevo) | Texto de apoyo sobre fondos oscuros — mismo mecanismo de opacidad que ya usa `--line-light`. |
| Color corporativo principal | `--color-brand-primary` | `#A11F48` (rojo vino) | `--wine` | Acento pleno único de la Home (Contact) + cualquier CTA primario en cualquier sección. |
| Color corporativo oscuro | `--color-brand-primary-dark` | `#7A1836` | — (nuevo) | Estado hover/pressed de elementos en `--color-brand-primary`; texto en vino oscurecido cuando se necesite más profundidad que el vino base. |
| Acento secundario | `--color-accent-secondary` | `#85B1B4` (verde agua) | — (nuevo) | Detalles puntuales: iconografía, micro-interacciones, bordes de foco sobre fondo oscuro. Nunca a pantalla completa. Ver advertencia 4.3 sobre su uso como texto. |
| Acento excepcional | `--color-accent-exceptional` | `#F4C542` (dorado mostaza) | `--acid` | Reservado para el segundo y último acento pleno del recorrido (Principles). Fuera de ese momento, uso mínimo (un detalle, nunca un fondo). Ver advertencia 4.2. |
| Bordes (sobre claro) | `--color-border` | `rgba(17,17,15,.18)` | `--line` | Sin cambios — se mantiene el mecanismo actual. |
| Bordes (sobre oscuro) | `--color-border-inverse` | `rgba(240,223,207,.2)` | `--line-light` | Mismo mecanismo, recalculado sobre el nuevo tono de crema en vez de blanco puro. |
| Hover (elementos en color corporativo) | `--color-hover-brand` | `#7A1836` | — (nuevo) | = `--color-brand-primary-dark`. Botones y enlaces en vino al pasar el cursor. |
| Hover (elementos neutros) | `--color-hover-neutral` | `#A11F48` a 100% sobre texto ink, o subrayado en vino | — (nuevo) | Enlaces de texto sobre crema: de `--color-text-primary` a `--color-brand-primary` en hover. |
| Focus (sobre fondo claro) | `--color-focus-on-light` | `#A11F48` (rojo vino) | — (nuevo) | Anillo de foco visible sobre crema/superficie clara. Ver advertencia 4.4 — el dorado mostaza falla aquí. |
| Focus (sobre fondo oscuro o vino) | `--color-focus-on-dark` | `#F4C542` (dorado mostaza) | — (nuevo) | Anillo de foco sobre verde grisáceo, ink o vino — es donde el dorado sí funciona como color de foco. |

---

## 4. Advertencias y decisiones abiertas (de la auditoría de contraste)

Estas cuatro cuestiones no son de gusto — salen directamente de los números de la sección 5 y conviene resolverlas en la revisión conjunta antes de tocar `tokens.css`.

**4.1 — Resuelto (2026-07-25).** El verde grisáceo profundo queda confirmado como fondo oscuro principal de uso general; `--ink` queda reservado en exclusiva para el momento de máxima inmersión de WorkZoom, tal y como proponía esta sección. No se retira del todo — se conserva como el escalón de intensidad más alto de la curva del masterplan (sección 4), pero como único uso.

**4.2 — Resuelto (2026-07-25), en sentido contrario al supuesto por defecto de esta propuesta.** El dorado mostaza se confirma como "acento muy controlado" — lectura que pesa más hacia el tamaño que hacia la frecuencia narrativa. Consecuencia directa: **Principles no hereda automáticamente un tratamiento de fondo pleno en dorado** cuando se rediseñe esa sección — necesitará un tratamiento propio (bloque de color, no toda la pantalla, o una superficie dorada más contenida) que se decidirá en el momento de diseñar esa sección, no aquí. Se retoma en `REFERENCE_HOME_HOME_REDESIGN_MASTERPLAN.md` cuando le toque turno a Principles.

**4.3 — El verde agua no debe usarse como color de texto sobre fondo crema.** Contraste 1.8:1 (sección 5) — muy por debajo del mínimo de accesibilidad. Es perfectamente válido como color de fondo de icono, borde o elemento gráfico grande (8:1 con texto ink encima), pero nunca como el color del propio texto sobre crema.

**4.4 — El foco no puede ser un único color global.** El dorado mostaza, pensado como color de foco, falla sobre crema (1.25:1) y funciona muy bien sobre fondo oscuro o vino (8.1:1 y 4.6:1). La propuesta resuelve esto con dos tokens contextuales (`--color-focus-on-light` / `--color-focus-on-dark`) en vez de uno solo — es la única forma de que el foco sea visible en todo el sitio sin excepciones.

---

## 5. Tabla de contraste y accesibilidad (WCAG 2.1)

Ratios calculados sobre los valores hexadecimales exactos de la sección 3. Umbrales de referencia: **4.5:1** texto normal AA, **3:1** texto grande / componentes de interfaz y foco (AA), **7:1** texto normal AAA.

| Combinación | Ratio | AA texto normal (≥4.5) | AA texto grande / UI (≥3) | AAA texto normal (≥7) |
|---|---|---|---|---|
| Ink `#11110F` texto sobre Crema `#F0DFCF` fondo | **14.6:1** | ✅ | ✅ | ✅ |
| Ink texto sobre Superficie clara `#F7ECE2` | **16.3:1** | ✅ | ✅ | ✅ |
| Vino `#A11F48` texto sobre Crema fondo | **5.8:1** | ✅ | ✅ | ❌ |
| Crema texto sobre Vino fondo (Contact) | **5.8:1** | ✅ | ✅ | ❌ |
| Vino oscuro `#7A1836` texto sobre Crema fondo | **8.0:1** | ✅ | ✅ | ✅ |
| Ink texto sobre Vino fondo | **2.5:1** | ❌ | ❌ | ❌ |
| Crema texto sobre Verde grisáceo `#4A5D5A` fondo | **5.4:1** | ✅ | ✅ | ❌ |
| Verde grisáceo texto sobre Crema fondo (texto secundario) | **5.4:1** | ✅ | ✅ | ❌ |
| Vino texto/elemento sobre Verde grisáceo fondo | **1.1:1** | ❌ | ❌ | ❌ |
| Ink texto sobre Dorado mostaza `#F4C542` fondo (Principles) | **11.6:1** | ✅ | ✅ | ✅ |
| Dorado mostaza texto sobre Crema fondo | **1.3:1** | ❌ | ❌ | ❌ |
| Dorado mostaza (foco) sobre Vino fondo | **4.6:1** | ✅ | ✅ | ❌ |
| Dorado mostaza (foco) sobre Verde grisáceo fondo | **4.3:1** | ✅ | ✅ | ❌ |
| Dorado mostaza (foco) sobre Ink fondo | **11.6:1** | ✅ | ✅ | ✅ |
| Ink texto sobre Verde agua `#85B1B4` fondo | **8.1:1** | ✅ | ✅ | ✅ |
| Verde agua texto sobre Crema fondo | **1.8:1** | ❌ | ❌ | ❌ |
| Verde agua elemento sobre Vino fondo | **3.2:1** | ❌ (texto) | ✅ (UI/foco) | ❌ |
| Crema texto sobre Superficie oscura `#5C6E6B` | **4.1:1** | ⚠️ (justo por debajo — usar solo en texto grande/titulares, no en cuerpo de texto pequeño) | ✅ | ❌ |
| Vino `#A11F48` (foco) sobre Crema fondo | **5.8:1** | ✅ | ✅ | ❌ |

**Lectura general:** los cinco colores corporativos, usados en los pares que propone esta tabla, cumplen AA en prácticamente todos los casos previstos de uso real. Los únicos fallos son combinaciones que esta propuesta ya evita por diseño (dorado o verde agua como texto sobre crema, ink sobre vino) — están en la tabla precisamente para documentar por qué esos pares están excluidos de los tokens de texto/fondo en la sección 3, no porque se vayan a usar así.

---

## 6. Qué no resuelve este documento

- No asigna color a ninguna sección nueva del masterplan (Valoración) más allá de heredar los tokens generales — el detalle de composición de esa sección sigue abierto en `REFERENCE_HOME_HOME_REDESIGN_MASTERPLAN.md`.
- No toca los 27 valores hexadecimales sueltos de las maquetas ficticias (hallazgo 2) — se retiran con las maquetas, no se tokenizan.
- No fija el tratamiento final de Principles (advertencia 4.2, resuelta en sentido de "no fondo pleno automático") — se diseñará cuando le toque turno a esa sección.

---

## 7. Color Proof — validación sobre la Home real (2026-07-25)

Antes de tocar `tokens.css`, se generó un **Color Proof**: capturas reales de 7 secciones de la Home (Hero, Valoración, Process, WorkZoom, BrandStory, Contact, Footer), cada una con dos versiones — los tokens de paridad heredados de la migración, y esos mismos tokens sustituidos por los cinco colores corporativos, sin tocar composición, layout ni tipografía. Se aprobó tras revisión, con estas conclusiones:

- Crema + rojo vino funcionan bien como pilares de identidad — confirmado.
- Verde grisáceo profundo aporta más personalidad que el negro genérico — confirmado, pasa a ser el fondo oscuro principal (advertencia 4.1, resuelta).
- Reservar `--ink` solo para el clímax de WorkZoom — confirmado.
- Verde agua permanece como color de apoyo, sin protagonismo — confirmado, sin cambios sobre la propuesta.
- Dorado mostaza como acento muy controlado — confirmado, con la consecuencia directa de la advertencia 4.2 (no fondo pleno automático en Principles).
- **Hallazgo más importante del proof:** las secciones que casi no cambian con el nuevo color (Hero, Valoración) son precisamente las que más necesitan transformarse — pero en dirección de arte, fotografía, composición y narrativa, no en color. **El color nunca fue el problema principal de la Home actual.**

## 8. Aprobación y aplazamiento deliberado de la implementación

**La dirección cromática de esta propuesta queda aprobada.** `src/ui/styles/tokens.css` **no se modifica todavía**, por decisión explícita, no por trabajo pendiente: el color y el rediseño de composición deben nacer juntos, sección por sección, empezando por el Hero (roadmap del masterplan, punto 1). Recolorear ahora la Home actual para volver a modificarla semanas después al rediseñarla sería trabajo duplicado.

Consecuencia práctica: **no hay una migración global de `tokens.css` como paso único.** Los tokens de esta propuesta se aplican en el momento en que cada sección se rediseña y se aprueba — Hero primero, después el resto del orden ya fijado en `REFERENCE_HOME_HOME_REDESIGN_MASTERPLAN.md`. Este documento y su tabla de tokens (sección 3) siguen siendo la referencia técnica de qué valor usar y por qué — lo que cambia es el momento de aplicarlos, no su contenido.
