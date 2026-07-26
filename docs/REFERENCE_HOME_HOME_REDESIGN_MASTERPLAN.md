# Reference Home — Masterplan de rediseño de la Home

**Estado:** Documento de dirección de producto y dirección creativa. No contiene código, no contiene mockups. Es la referencia absoluta para el rediseño de la Home a partir de ahora.
**Fecha:** 2026-07-25. **Revisión 2** — corrige un error de fondo de la revisión 1 (ver sección 0.1).
**Precede a:** cualquier modificación de `src/app/page.tsx` o de sus secciones. Ninguna sección se toca hasta que este documento esté revisado y aprobado.
**Sustituye a:** el enfoque de "paridad estricta" que gobernó `docs/MIGRACION.md`. La arquitectura técnica validada (Next.js App Router, CSS Modules, motion artesanal sin librerías, convención `data-*`, oráculo de regresión visual Playwright) se conserva; el contenido, la composición y la dirección de arte que corría sobre esa arquitectura, no.

---

## 0.1 — Corrección de fondo (2026-07-25)

La primera versión de este documento planteaba la Home como si Reference Home fuera un estudio digital o una agencia creativa: "Dirección digital", "Desarrollo web", "Identidad de marca", casos de estudio de diseño web dentro de maquetas de dispositivo, métricas de build, "Hablemos de tu proyecto". Eso era un error de fondo, no un matiz de estilo.

**Reference Home es una inmobiliaria premium con sede en Valencia.** Todo lo que sigue reescribe la revisión 1 desde ese hecho. La arquitectura técnica migrada (componentes, hooks de motion, sistema de tokens, convención `data-*`) se mantiene íntegra — es un conjunto de mecanismos de interacción reutilizables, no de contenido. Lo que cambia por completo es **qué cuenta cada mecanismo y en qué orden**.

La Home no debe parecer un portal inmobiliario (grillas de filtros, badges de precio, iconografía de agencia agregadora) ni tampoco un estudio de diseño (mockups de dispositivo, jerga de producto digital). Debe ser **una experiencia editorial, cinematográfica y mediterránea al servicio de una inmobiliaria premium** — el mismo nivel de cuidado compositivo que ya existía, puesto por completo al servicio de vender y presentar viviendas reales.

---

## 0. Decisiones previas

1. **Todo el contenido de plantilla desaparece** — casos ficticios, la frase de `config.php`, `hola@tudominio.es`, las métricas de build. Ninguno vuelve a aparecer, ni siquiera como referencia temporal.
2. **Nombre de marca: "Reference Home".** Se aplica de forma consistente (wordmark, `<title>`, Footer, metadatos).
3. **No hay rediseño incremental.** Cada sección se replantea desde su propósito narrativo y emocional real — el de una firma inmobiliaria, no el de una agencia digital.
4. **Lo que se conserva de la dirección de arte actual:** la paleta (aprobada aparte en `docs/PALETA_CORPORATIVA.md`, validada con Color Proof); el contraste tipográfico sans-bold / serif-itálica dentro del mismo titular; el espacio negativo generoso; el sistema editorial de numeración de sección + eyebrow; el cursor a medida y el ruido de fondo. Lo que **no** se conserva de la revisión 1: el sistema de "marco de dispositivo" (chrome de navegador/tablet) — no tiene ningún lugar en una inmobiliaria y se retira por completo, sustituido por fotografía inmobiliaria real a pantalla completa (sección 9).
5. **La paleta corporativa (`docs/PALETA_CORPORATIVA.md`) queda aprobada y no se rehace en este documento** — su implementación en `tokens.css` sigue aplazada hasta que cada sección se rediseñe (ver `docs/PALETA_CORPORATIVA.md`, sección 8).

---

## 1. Objetivos de la nueva Home

1. **Vender el criterio de Reference Home, no un catálogo.** La Home no lista propiedades como un portal — selecciona, presenta y cuenta cada vivienda como una decisión editorial, no como una ficha de datos.
2. **Diferenciarse de dos referentes a la vez:** ni portal inmobiliario (Idealista/Fotocasa: grillas, filtros, precio como titular) ni estudio de diseño (lo que era esta Home hasta ayer). Un tercer territorio: inmobiliaria premium con voz editorial propia.
3. **Un único clímax emocional**, no tres secciones de scroll-progreso compitiendo entre sí (hallazgo ya validado en la auditoría original, sigue vigente y ahora se aplica a contenido real: una única operación insignia, no un caso de estudio de diseño web).
4. **Reforzar confianza antes de pedir nada**, y repartir la conversión en tres intenciones reales — valorar, vender, hablar con un asesor — no en un único formulario genérico al final.
5. **La fotografía arquitectónica es el centro de la identidad visual**, no un adorno. La tríada ya producida del Hero (`images/hero-dia.png`, `images/hero-atardecer.png`, `images/hero-noche.png`) fija el nivel de exigencia fotográfica para todo lo demás.

---

## 2. Mapa de secciones

La arquitectura técnica (11 bloques, mismos mecanismos de motion) se conserva. El **orden** y el **contenido** se reescriben por completo para seguir, en secuencia, la historia de 10 puntos que define el negocio real. El orden de las secciones ya no coincide con el orden heredado de la migración — se ha reordenado para que la página cuente la historia correcta, tal y como autoriza la corrección de la sección 0.1.

| # | Sección (contenido) | Mecanismo técnico heredado | Punto(s) de la historia de negocio |
|---|---|---|---|
| 01 | **Hero** | Hero — intro a pantalla completa | 1. Reference Home y su promesa de marca |
| 02 | **Manifesto** | Manifesto — reveal palabra a palabra | 2+3. La vivienda y su forma distinta de presentarla + el valor de una estrategia de venta bien diseñada (una sola declaración editorial en dos movimientos) |
| 03 | **Valoración** | (antes "Stats"/contador) — bloque de servicio dedicado, no accordion | 4. El servicio de valoración profesional |
| 04 | **Viviendas** | ProjectsGallery — índice horizontal | 5. Las viviendas y operaciones reales |
| 05 | **Método de venta** | Process — grid de pasos | 6. Nuestro método de venta |
| 06 | **Marketing inmobiliario premium** | Solutions — acordeón | 7. Marketing inmobiliario premium |
| 07 | **Operación insignia** | WorkZoom — inmersión por zoom (pinned) | Clímax — extiende los puntos 5 y 7 en su forma más intensa; no consume un punto numerado propio |
| 08 | **Prueba y confianza** | BrandStory — narrativa pinned en pasos + contador (heredado de Stats) | 8. Prueba y confianza |
| 09 | **Firma de Valencia** | Principles — pull-quote + reveal de lista | 9. Reference Home como firma inmobiliaria de Valencia |
| 10 | **Conversión** | Contact — formulario, ahora con 3 intenciones | 10. Conversión |
| 11 | **Footer** | Footer | Cierre, sin punto narrativo propio |

Ningún concepto de la revisión 1 sobrevive tal cual: Solutions deja de listar servicios digitales y pasa a listar disciplinas de marketing inmobiliario; ProjectsGallery deja de mostrar maquetas de proyectos web ficticios y pasa a mostrar viviendas y operaciones reales; WorkZoom deja de ser un "caso de estudio de diseño" y pasa a ser la operación inmobiliaria más destacada, mostrada con fotografía real; BrandStory deja de narrar "de la idea a la marca" y pasa a narrar el acompañamiento real al cliente; Stats deja de medir componentes de software y sus cifras (reubicadas dentro de Prueba y confianza) pasan a medir resultados inmobiliarios reales.

---

## 3. Narrativa completa del recorrido

Cinco movimientos, ahora anclados al negocio real:

**Movimiento I — Presentación (Hero, Manifesto).** Reference Home se presenta con la misma serenidad de antes, pero ahora sobre arquitectura real: una vivienda mediterránea, la misma casa en tres momentos de luz. El manifiesto explica, en una sola voz, dos ideas contiguas: que una vivienda se presenta de otra forma cuando se hace bien, y que una estrategia de venta bien diseñada tiene valor propio — no es trámite, es criterio.

**Movimiento II — Servicio y evidencia (Valoración, Viviendas).** Aquí el visitante puede accionar de inmediato (solicitar una valoración) o explorar la evidencia (viviendas y operaciones reales, navegable con calma, sin exigir inmersión total todavía).

**Movimiento III — Método y clímax (Método de venta, Marketing premium, Operación insignia).** Se explica cómo se trabaja (método, en tono seguro) y con qué medios (marketing inmobiliario premium: fotografía, vídeo, home staging, renders, tour virtual, dron, difusión), y todo eso converge en un único momento de inmersión total: la operación insignia, la vivienda que mejor demuestra qué significa "premium" en Reference Home.

**Movimiento IV — Confianza e identidad (Prueba y confianza, Firma de Valencia).** Después del pico, la Home baja de intensidad sin perder contenido: quién ha comprado, qué experiencia y resultados reales hay detrás, y qué acompañamiento legal y fiscal se ofrece. Cierra con la afirmación de identidad más nítida de la página: Reference Home como firma inmobiliaria de Valencia, no una inmobiliaria genérica operando en Valencia.

**Movimiento V — Invitación (Conversión, Footer).** Tres caminos reales y distintos — valorar, vender, hablar con un asesor — no un formulario ambiguo. Footer cierra con la misma seguridad tranquila del Hero.

---

## 4. Ritmo del scroll, pantalla por pantalla

| # | Sección | Intensidad (1-5) | Función en la curva |
|---|---|---|---|
| 01 | Hero | 2 | Arranque cinematográfico, sereno |
| 02 | Manifesto | 1 | Primer respiro — lectura, pausa |
| 03 | Valoración | 2 | Sube ligeramente — primera acción posible |
| 04 | Viviendas | 3 | Exploración activa, deseo |
| 05 | Método de venta | 2 | **Respiro deliberado**, justo antes de retomar impulso |
| 06 | Marketing inmobiliario premium | 3 | Retoma impulso — demostración de capacidad |
| 07 | Operación insignia | **5** | **Pico único de toda la Home** |
| 08 | Prueba y confianza | 3 | Baja desde el pico, sin desplomarse — contenido de confianza |
| 09 | Firma de Valencia | 2 | Resolución — identidad, no movimiento |
| 10 | Conversión | 3 | Repunte final — tres caminos, energía propia |
| 11 | Footer | 1 | Cierre en calma |

Regla invariante (heredada de la revisión 1, sigue vigente): **hay un único 5 en todo el recorrido.** Antes competían tres secciones casi idénticas por ese lugar; ahora solo la Operación insignia lo ocupa, y todo lo demás construye hacia ella o desciende desde ella.

---

## 5. Recorrido sección a sección

### 01 · Hero
- **Emoción:** calma cinematográfica, deseo de pertenencia a un lugar — no asombro forzado.
- **Interacción:** la misma vivienda mediterránea en tres momentos de luz (día → atardecer → noche), en transición progresiva vinculada al scroll dentro del propio Hero; un punto de luz (el sol/la luna) recorre el cielo acompañando el avance — funciona a la vez como atmósfera y como wayfinding sutil del progreso. Composición limpia, protagonismo total de la arquitectura y la luz, sin superponer demasiado texto sobre la imagen.
- **Fotografía — ya producida:** `images/hero-dia.png`, `images/hero-atardecer.png`, `images/hero-noche.png`. Misma villa, mismo encuadre de cámara, misma piscina infinita y vista al mar en los tres estados — exactamente la triada que este documento pedía antes de escribirse. **Esta triada fija el nivel de calibración fotográfica para el resto de la Home**: luz natural, arquitectura mediterránea contemporánea (piedra, cal, madera, olivo), ausencia de personas, ausencia de distorsión de gran angular tipo portal inmobiliario.
- **CTA:** dos, no uno — **corrección 2026-07-26** (ver `docs/HERO_REDESIGN_SPEC.md`, aprobado): el Hero deja de ser exclusivamente exploratorio. CTA principal ("Valora tu vivienda") adelanta la conversión temprana de Valoración (03); CTA secundario ("Descubre cómo trabajamos") es el único puramente exploratorio. Se mantiene la regla de no repetir CTA en forma/tono (sección 6): en Valoración (03) el mismo camino de conversión aparece en su contexto de servicio completo, no como botón flotante — son el mismo destino, dos puntos de entrada distintos, no una repetición. El header pasa a llevar desde aquí un acceso persistente a "Hablar con un asesor" (ver sección 6).

### 02 · Manifesto
- **Emoción:** criterio, calma, convicción de que la vivienda se presenta de otra manera aquí.
- **Interacción:** reveal palabra a palabra dirigido por scroll (mecanismo intacto de la migración — es el mejor calibrado del sitio).
- **Contenido:** una sola pieza editorial en dos movimientos — qué significa presentar una vivienda de otra forma, y por qué una estrategia de venta bien diseñada tiene valor propio. Registro directo, sin adjetivos de relleno.
- **Fotografía:** ninguna, a propósito — es una declaración, no un escaparate.
- **CTA:** ninguno.

### 03 · Valoración
- **Emoción:** utilidad inmediata — "esto es para mí, ahora mismo."
- **Interacción:** bloque de servicio dedicado y directo, no un acordeón de varios ítems (ese mecanismo se reserva para Marketing premium, sección 06, que sí es una lista real). Es la primera de las tres conversiones de la Home (ver sección 6) y debe sentirse como el camino más corto de toda la página.
- **Fotografía:** opcional y ligera — como mucho una imagen que transmita criterio profesional (una tasación, un plano, un detalle arquitectónico), nunca imprescindible; el peso de la sección es la promesa de servicio, no la imagen.
- **CTA:** **"Solicita la valoración de tu vivienda"** — explícito, primario, sin fricción.

### 04 · Viviendas
- **Emoción:** curiosidad, deseo — "esto es lo que hemos vendido y representado, y es real."
- **Interacción:** índice horizontal navegable a ritmo propio del usuario (scroll convencional o arrastre, sin scroll-pinned que bloquee el avance — ese mecanismo se reserva en exclusiva para la Operación insignia). Cada tarjeta es una vivienda u operación real: ubicación, tipología, estado (vendida / en cartera).
- **Fotografía a producir:** el mayor volumen de producción de todo el proyecto — una portada por vivienda real, más 1-2 detalles por propiedad destacada. Sustituye por completo al antiguo sistema de "marco de dispositivo" — aquí no hay chrome de navegador ni pantallas simuladas, solo fotografía inmobiliaria real a pantalla completa con una banda editorial mínima superpuesta (ubicación / tipología / estado).
- **CTA:** "Ver todas las viviendas" (a las páginas interiores, cuando existan).

### 05 · Método de venta
- **Emoción:** método, seguridad — "esto está profesionalmente organizado, no improvisado." Segundo respiro deliberado antes de retomar impulso.
- **Interacción:** grid de 5 pasos (Escuchamos · Diseñamos la estrategia · Lanzamos · Negociamos · Acompañamos) — mismo mecanismo que el antiguo Process (4 columnas → 5), estático con acento ligero de scroll opcional.
- **Fotografía:** ninguna — sección tipográfica a pantalla completa, como su antecesora.
- **CTA:** ninguno.

### 06 · Marketing inmobiliario premium
- **Emoción:** capacidad, calidad de ejecución — "esto es de otro nivel que un anuncio de portal."
- **Interacción:** acordeón (mecanismo heredado de Solutions) con las disciplinas reales: fotografía, vídeo, home staging, renders, tour virtual, dron, posicionamiento y difusión — 7 ítems en vez de los 4 servicios digitales de la revisión 1. Al abrir cada uno, se muestra una pieza real representativa de esa disciplina.
- **Fotografía a producir:** un still representativo por disciplina (7 en total) — fotografía de producto fotográfico real, un fotograma de vídeo, una imagen de home staging antes/después, un render, un fotograma de tour virtual, una toma de dron, una pieza de difusión. Ninguna maqueta de dispositivo.
- **CTA:** enlace suave hacia la Operación insignia ("Ver un caso real").

### 07 · Operación insignia
- **Emoción:** asombro, inmersión total — el único 5 de toda la Home.
- **Interacción:** se conserva íntegra la mecánica de zoom pinned (la pieza de motion mejor lograda del sitio) — ahora hace zoom sobre fotografía real de la vivienda u operación más destacada de Reference Home, no sobre una pantalla de mockup.
- **Fotografía a producir:** el set más rico de todo el proyecto para una única propiedad insignia — vista exterior completa, un detalle de composición/interior, una toma aérea/dron, posiblemente un fragmento de vídeo silencioso si se decide incorporar vídeo a la Home (a confirmar).
- **CTA:** "Descubre esta vivienda" / "Hablar con un asesor sobre esta operación" — el punto de mayor probabilidad de conversión antes de llegar a la sección de Conversión.

### 08 · Prueba y confianza
- **Emoción:** confianza, acompañamiento — "nos guían de principio a fin."
- **Interacción:** narrativa pinned en 4 pasos (heredada de BrandStory: compradores → experiencia → resultados reales → acompañamiento legal y fiscal). El motivo de brújula se conserva y, por primera vez, su significado deja de ser metafórico-genérico para ser literal: una brújula que guía es exactamente lo que hace un acompañamiento inmobiliario bien hecho.
- **Cifras reales:** el mecanismo de contador ascendente que antes vivía en una sección "Stats" independiente se traslada aquí, dentro del paso "resultados reales" (años de trayectoria, viviendas vendidas, tiempo medio de venta, satisfacción de cliente — cifras reales de negocio, nunca inventadas ni de build).
- **Fotografía — punto abierto para la revisión conjunta:** esta sección es la candidata más fuerte de toda la Home a incorporar fotografía humana real (entrega de llaves, firma, asesor y cliente) — el caso es más fuerte aquí que en la revisión 1, porque el acompañamiento es literalmente el tema de la sección. Queda pendiente de decisión, no resuelto por este documento.
- **CTA:** ninguno directo — sigue construyendo hacia Firma de Valencia.

### 09 · Firma de Valencia
- **Emoción:** orgullo de lugar, convicción — la resolución de identidad de toda la Home.
- **Interacción:** pull-quote + reveal de lista (mecanismo heredado de Principles). **Cambio importante respecto a la revisión 1:** esta sección ya no hereda automáticamente un fondo pleno de dorado mostaza — la paleta corporativa (`docs/PALETA_CORPORATIVA.md`, advertencia 4.2, resuelta) confirma el dorado como "acento muy controlado", no como color de fondo a pantalla completa. Aquí se propone un fondo fotográfico (Valencia — skyline, costa o arquitectura icónica) con el dorado como acento puntual sobre la cita destacada, no como fondo.
- **Fotografía a producir:** una imagen icónica de Valencia — la segunda gran pieza fotográfica del proyecto después de la triada del Hero.
- **CTA:** puente suave hacia Conversión.

### 10 · Conversión
- **Emoción:** invitación clara, facilidad de elegir.
- **Interacción:** **cambio de contenido, no de mecanismo** — el formulario se mantiene simulado y sin integración real (sin cambios sobre lo ya acordado en `docs/MIGRACION.md`), pero deja de presentar una única intención genérica y pasa a presentar **tres caminos explícitos**: valorar mi vivienda, vender con Reference Home, hablar con un asesor. La composición exacta (pestañas, tarjetas, un único formulario con selector de intención) es una decisión de diseño de composición, no de este documento — lo que fija el masterplan es que deben existir las tres, con el mismo peso visual, sin que ninguna se sienta secundaria.
- **Fotografía:** ninguna — sección centrada en la acción.
- **CTA:** las tres intenciones son, en sí mismas, la conversión.

### 11 · Footer
- **Emoción:** cierre en calma, confianza residual.
- **Interacción:** sin cambios de mecanismo.
- **Contenido:** datos de contacto reales, enlaces legales propios de una inmobiliaria regulada (aviso legal, protección de datos, condiciones) — a completar cuando existan las páginas interiores correspondientes.
- **CTA:** enlaces reales, "volver arriba".

---

## 6. Redistribución de los CTA

Tres intenciones reales, no una genérica, repartidas en cinco momentos sin repetir tono ni texto:

1. **Header (persistente desde que se abandona el Hero):** "Hablar con un asesor" — acceso directo para quien ya sabe lo que quiere.
2. **Hero:** ya no es exclusivamente exploratorio (corrección 2026-07-26, ver `docs/HERO_REDESIGN_SPEC.md`) — CTA principal "Valora tu vivienda" (conversión temprana) + CTA secundario "Descubre cómo trabajamos" (exploratorio).
3. **Valoración (03):** "Solicita la valoración de tu vivienda" — mismo destino que el CTA principal del Hero, en su contexto de servicio completo; conversión de fricción mínima.
4. **Operación insignia (07):** "Descubre esta vivienda" / hablar sobre esa operación — conversión en el pico emocional.
5. **Firma de Valencia (09) → Conversión (10):** puente suave hacia las tres intenciones explícitas (valorar, vender, hablar con un asesor), que son el destino final de todos los caminos anteriores.

Regla heredada, sigue vigente: ningún CTA se repite en forma ni en tono.

---

## 7. Qué desaparece, qué nace, qué cambia por completo

- **Desaparece sin excepción:** el sistema de "marco de dispositivo" (chrome de navegador/tablet) como lenguaje visual; cualquier mención a servicios digitales (dirección digital, desarrollo web, identidad de marca, contenido editorial) como línea de negocio; los casos de estudio de diseño web ficticios; las métricas de build; "Hablemos de tu proyecto" como texto de CTA.
- **Nace:** la sección Valoración con su significado correcto (servicio real de tasación, no cifras de negocio); las tres intenciones explícitas de Conversión.
- **Cambia por completo el contenido, conservando el mecanismo:** Viviendas (antes Proyectos), Método de venta (antes Process, 4→5 pasos), Marketing inmobiliario premium (antes Solutions, 4→7 ítems), Operación insignia (antes WorkZoom), Prueba y confianza (antes BrandStory, incorpora el contador que antes vivía en Stats), Firma de Valencia (antes Principles, pierde el fondo pleno automático de acento).
- **Se mantiene con cambios menores:** Hero (composición conservada, ahora con fotografía real en vez de ser puramente gráfico), Manifesto (mecanismo y registro conservados, contenido reescrito), Footer.

---

## 8. Reglas de composición

- **El sistema de "marco de dispositivo" queda retirado por completo** y sustituido por un **sistema de encuadre fotográfico**: misma proporción de imagen, mismo criterio de horizonte, misma banda editorial mínima (ubicación / tipología / estado) superpuesta — aplicado de forma idéntica en Viviendas, Marketing premium y Operación insignia, para que el visitante reconozca que está ante el mismo lenguaje visual cada vez que aparece una propiedad real.
- **Alineación a la izquierda como eje dominante** — se mantiene.
- **El sistema de numeración de sección + eyebrow** se mantiene y se renumera según el nuevo orden de la sección 2.
- **Asimetría deliberada, no simetría de plantilla** — se mantiene.
- **Cada sección tiene un único punto focal** — se mantiene, ahora aplicado a fotografía real en vez de a mockups.

## 9. Reglas de tipografía

- El contraste sans-bold / serif-itálica dentro del mismo titular se mantiene como firma tipográfica única.
- Regla de uso sin cambios: el peso sans-bold para la palabra estructural/afirmativa, la serif-itálica para la palabra emocional o de matiz — aplicado ahora a un registro inmobiliario premium, no de agencia digital (ejemplo ilustrativo, no copy final: "no vendemos **casas**, representamos *un lugar*").
- Jerarquía de escala sin cambios.
- El copy abandona cualquier resto de vocabulario de agencia digital ("innovador", "disruptivo", "producto digital") en favor de un registro inmobiliario editorial: preciso, sereno, con autoridad de mercado local.

## 10. Reglas de fotografía

- **La fotografía arquitectónica/inmobiliaria real es el centro de la identidad visual de la Home, no la excepción** — cambio de fondo respecto a la revisión 1, donde casi no había fotografía.
- **Cero fotografía de stock. Cero estética de portal inmobiliario** (gran angular deformado, flash directo, cielos quemados, marcas de agua) — la Home debe distinguirse precisamente de ese registro.
- **La triada del Hero (`images/hero-dia.png`, `-atardecer.png`, `-noche.png`), ya producida, es la referencia de calibración para toda fotografía futura**: luz natural, arquitectura contemporánea mediterránea, encuadre limpio, ausencia de personas, misma disciplina de cámara.
- **Producción necesaria, por sección:** Valoración (opcional, 1 imagen) · Viviendas (portada + 1-2 detalles por propiedad real) · Marketing premium (7 stills, uno por disciplina) · Operación insignia (set rico: exterior, detalle, aérea/dron, posible vídeo) · Prueba y confianza (punto abierto: fotografía humana real de acompañamiento) · Firma de Valencia (1 imagen icónica de Valencia).
- **Gradación de color consistente** atada a la paleta corporativa (`docs/PALETA_CORPORATIVA.md`) — tinte sutil, nunca un filtro que anule el color real de la arquitectura.
- **Ninguna vivienda ni operación mostrada puede ser ficticia** — si una propiedad real no está lista para mostrarse, la sección correspondiente muestra menos propiedades, nunca una inventada.

## 11. Reglas de color

Sin cambios respecto a `docs/PALETA_CORPORATIVA.md` (documento aprobado por separado) — solo se actualiza la asignación de "terrenos" a las secciones ya renombradas:

- **Crema** (calma/lectura): Hero, Manifesto, Valoración, Viviendas.
- **Verde grisáceo profundo** (fondo oscuro principal): Método de venta.
- **Ink** (reservado en exclusiva): Operación insignia — el único pico de intensidad.
- **Acento pleno vino:** Conversión — único acento pleno que queda en toda la Home tras la resolución de la advertencia 4.2 (Firma de Valencia deja de tener fondo pleno de dorado automático, ver sección 5). Esto simplifica la regla de continuidad anterior ("ningún acento pleno vecino de otro") — ya no hay dos acentos plenos que puedan quedar adyacentes.
- **Dorado mostaza:** acento puntual — Marketing premium (algún detalle), Firma de Valencia (la cita destacada, no el fondo).
- **Verde agua:** apoyo puntual, sin protagonismo — pendiente de su primera aplicación real durante el rediseño de composición.

## 12. Reglas de animación

- **Máximo dos mecánicas de inmersión (scroll-pinned con bloqueo de avance) en toda la Home — hoy, una sola: Operación insignia.**
- **Cada patrón de interacción se usa una sola vez:** el pinned-zoom (Operación insignia), el reveal palabra a palabra (Manifesto), el contador ascendente (dentro de Prueba y confianza), el acordeón (Marketing premium), el índice horizontal (Viviendas).
- Todo movimiento se justifica por la emoción que sirve (sección 5) — Método de venta y Firma de Valencia siguen siendo, a propósito, las secciones más quietas.
- `prefers-reduced-motion` y el comportamiento simplificado por debajo de 901px se heredan sin discusión.

## 13. Reglas de espaciado

Sin cambios de fondo respecto a la revisión 1 — el espacio negativo generoso sigue siendo un activo de marca. Manifesto y Firma de Valencia son ahora las secciones con más aire.

## 14. Reglas de continuidad entre secciones

- La numeración de sección es continua y secuencial según el nuevo orden de la sección 2.
- El tono del header se revisa sección por sección según la nueva asignación de "terrenos" (sección 11).
- El sistema de encuadre fotográfico (sección 8) debe verse idéntico en Viviendas, Marketing premium y Operación insignia.
- El movimiento se atenúa hacia los extremos de la página (Hero, Footer) y se intensifica en el centro narrativo (Operación insignia) — misma forma de campana que antes, ahora sobre contenido real.

---

## 15. Qué no resuelve este documento

- No fija copy final, solo tono y función de cada bloque de texto.
- No decide todavía si Prueba y confianza incorpora fotografía humana real (sección 5, punto abierto).
- No diseña la composición exacta de Conversión (pestañas vs. tarjetas vs. formulario con selector) — solo exige que existan las tres intenciones con el mismo peso.
- No entra en páginas interiores.
- No modifica `tokens.css` — la paleta sigue aprobada y aplazada según `docs/PALETA_CORPORATIVA.md`, sección 8.

## 16. Siguiente paso

Revisión conjunta de esta corrección de fondo. Solo después de su aprobación explícita empieza el rediseño del Hero (sección 5, punto 01) — el primer punto donde ya existe fotografía producida y lista (`images/hero-dia.png`, `images/hero-atardecer.png`, `images/hero-noche.png`).
