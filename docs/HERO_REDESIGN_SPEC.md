# Hero — especificación de rediseño

**Estado:** Documento de definición visual y funcional. No contiene código, no contiene mockups. Precede a cualquier implementación del Hero.
**Fecha:** 2026-07-26.
**Depende de:** `docs/REFERENCE_HOME_HOME_REDESIGN_MASTERPLAN.md` (aprobado, revisión 2) y `docs/PALETA_CORPORATIVA.md` (aprobado, implementación aplazada — se aplica ya en este documento porque el Hero es la primera sección que se rediseña).
**Activos base:** `images/hero-dia.png`, `images/hero-atardecer.png`, `images/hero-noche.png`.

---

## 0. Verificación técnica de las tres imágenes base

Verificación directa de los tres archivos (dimensiones y metadatos leídos con `System.Drawing`; alineación geométrica verificada con un diff de bordes usando `pixelmatch`/`pngjs`, ya presentes en el proyecto para el oráculo de regresión visual).

| Archivo | Dimensiones | Proporción | DPI | Formato de color | Peso |
|---|---|---|---|---|---|
| `hero-dia.png` | 1916 × 821 px | 2.3337:1 | 96 | 24bpp RGB (sin alfa) | 2.06 MB |
| `hero-atardecer.png` | 1916 × 821 px | 2.3337:1 | 96 | 24bpp RGB (sin alfa) | 1.96 MB |
| `hero-noche.png` | 1916 × 821 px | 2.3337:1 | 96 | 24bpp RGB (sin alfa) | 1.86 MB |

**Dimensiones y proporción:** las tres son idénticas — 1916×821px exactos, sin excepción. La proporción (2.33:1) es prácticamente el estándar cinematográfico 21:9, coherente con el objetivo de "sensación cinematográfica" del propio encargo.

**Resolución:** 1916px de ancho es suficiente para un hero a pantalla completa en monitores estándar (hasta ~1920px de viewport a 1x), pero **insuficiente para pantallas retina/alta densidad y monitores ultra-anchos** (2560px+, 3440px ultrawide) sin reescalado — a esa anchura de viewport, la imagen se serviría por debajo de su resolución nativa y perdería nitidez. Marcado como riesgo técnico (sección 16).

**Peso:** ~1.86–2.06 MB por archivo, ~5.9 MB los tres juntos. Es un peso de **archivo de trabajo**, no de producción — PNG es un formato sin pérdida y muy ineficiente para fotografía; ningún archivo debe servirse tal cual al navegador (estrategia de carga en sección 14).

**Coincidencia de encuadre y geometría — verificado, sin problemas:** un diff de color directo entre las tres imágenes da un 80-89% de píxeles distintos, pero esa cifra por sí sola no dice nada — es exactamente lo esperable cuando cambia la luz ambiente de todo el encuadre. La comprobación relevante es si la **arquitectura** (el objeto que debe permanecer fijo mientras cambia la luz) está alineada. Para aislar eso, se generó un mapa de bordes (Sobel) de cada imagen y se comparó el mapa de bordes entre pares, no el color:

| Par | Diferencia de color bruta | Diferencia de mapa de bordes (geometría) |
|---|---|---|
| Día vs. atardecer | 89.00% | 11.15% |
| Día vs. noche | 89.12% | 9.50% |
| Atardecer vs. noche | 80.38% | 7.86% |

La caída de ~89% a ~8-11% al pasar de comparar color a comparar bordes confirma que **la línea de tejado, el borde de la piscina, los muros de piedra, la columna y el mobiliario de terraza ocupan el mismo píxel en las tres imágenes** — es la misma cámara, el mismo encuadre, solo cambia la luz. El diferencial de bordes que queda (7-11%) se concentra casi por completo en el follaje del olivo y la vegetación del fondo (textura fina que varía de forma natural entre tomas, y en la imagen de noche aparecen además bordes nuevos genuinos — luces encendidas, farolillos — que no existen de día). Ninguna de las dos cosas es un problema: la vegetación no necesita alinearse píxel a píxel para que la ilusión funcione, y las luces nuevas de noche son, precisamente, parte de lo que hace creíble la transición.

**Conclusión de la verificación:** las tres imágenes son aptas, sin reservas, para un crossfade directo. **No** son "tres fotos distintas que se atraviesan" — son la misma composición con la luz cambiada, que es exactamente lo que pedía el encargo ("no debe sentirse como tres imágenes que aparecen y desaparecen. Debe percibirse como una misma vivienda atravesando el paso del tiempo"). El único trabajo pendiente es de **rendimiento** (formato/peso) y de **encuadre responsive** (proporción 21:9 en viewports móviles muy verticales) — ambos se detallan en las secciones correspondientes, no son defectos de las imágenes en sí.

---

## 1. Objetivo narrativo

Establecer, en el primer fotograma que ve cualquier visitante, que Reference Home es una autoridad estética sobre arquitectura mediterránea premium — antes de decir una sola palabra sobre servicios. El dispositivo día → atardecer → noche comunica, sin necesidad de explicarlo en el copy, una idea central del negocio: **una vivienda premium se vive a cualquier hora, y Reference Home entiende esa vivienda en las tres**. Es el punto 1 del masterplan ("Reference Home y su promesa de marca"), resuelto casi enteramente por la imagen, no por el texto.

## 2. Emoción de entrada

Calma, deseo contenido, quietud cinematográfica. No es energía de venta ni urgencia — es la sensación de detenerse a mirar una casa que ya parece conocida. El ritmo de entrada debe sentirse lento y deliberado, coherente con la intensidad "2" que le asigna el masterplan (arranque sereno, no eufórico).

## 3. Composición exacta en desktop

Se conserva la composición actual de `Hero.tsx` — wordmark arriba-izquierda, nav arriba-derecha, eyebrow + copyright en una tira superior fina, titular en el tercio inferior-izquierdo, CTA circular abajo-derecha, tira de servicios anclada al borde inferior. **El único cambio estructural es qué hay detrás:** el fondo de gradiente plano desaparece y se sustituye por las tres fotografías en crossfade, con el punto de luz como único elemento gráfico nuevo.

- **Fondo:** las tres imágenes, a pantalla completa (`object-fit: cover`), apiladas, con opacidad cruzada dirigida por el progreso de scroll (mecánica en sección 10).
- **Titular:** se mantiene en el tercio inferior-izquierdo, sobre un scrim (degradado oscuro de abajo hacia arriba, opacidad decreciente) que garantiza contraste en los tres estados de luz sin depender de que la fotografía "coopere" en cada instante — ver sección 15 (contraste).
- **Punto de luz:** ocupa la franja superior-central del encuadre (la zona de cielo), en la posición donde estaría el sol/la luna en cada estado — nunca se superpone al titular ni a la vivienda.
- **CTA principal:** circular, magnético, abajo-derecha — mecánica idéntica a la actual (`useMagnetic`), reposicionado si hiciera falta para no competir con el punto de luz en su recorrido. Ahora lleva conversión temprana (sección 8), no solo texto exploratorio.
- **CTA secundario:** enlace de texto discreto, subrayado + flecha, junto al bloque de titular/texto secundario (inferior-izquierdo) — menor peso visual que el CTA principal, es la invitación puramente exploratoria (sección 8).
- **Tira de servicios:** se conserva como patrón estructural (línea fina + 4 etiquetas en la base del Hero); su contenido deja de ser servicios digitales y pasa a listar el mismo tipo de valor que estructura el resto de la Home (contenido exacto a decidir en la fase de copy del Hero, fuera del alcance de este documento de composición).

## 4. Adaptación a tablet y móvil

- **Tablet (~768-1024px):** misma composición, titular puede reducir tamaño/ancho de línea; `object-position` del fondo se ajusta para mantener la vivienda centrada según cambia el ancho disponible.
- **Móvil (<768px, retrato) — encuadre definitivo, verificado.** Una imagen 21:9 no puede cubrir un viewport de proporción ~9:19.5 sin recortar agresivamente uno de los dos ejes: a 390×844px, el recorte visible es de solo ~379px de los 1916px originales (~19.8% del ancho de la fotografía). Se probaron y renderizaron recortes reales (no simulados) en un rango de `object-position` horizontal de 40% a 70%, sobre los tres estados de luz, para elegir uno solo con evidencia en vez de por criterio visual sin verificar.

  **Valor definitivo: `object-position: 70% center`.** A este valor, el recorte muestra de forma simultánea: el voladizo completo de cubierta y el muro de piedra (fachada), la esquina de la piscina con el agua reconocible, la zona de comedor exterior con vista directa al interior a través de la carpintería acristalada (relación interior-exterior), y una entrada natural y no dominante de la copa del olivo por el borde superior derecho (presencia controlada, tal como se pedía) — a costa de perder el mar y el horizonte por completo, que es la pérdida que el propio encargo ya asumía como aceptable.

  **Verificación contra los cinco criterios pedidos, con los tres estados renderizados al mismo `object-position: 70%`:**
  1. *No cambia el punto focal entre día, atardecer y noche* — verificado por construcción: los tres renders usan idénticos parámetros de recorte, así que la ventana visible es idéntica en los tres; solo cambia la luz dentro de ella (fachada, piscina y rama del olivo ocupan el mismo píxel en los tres estados).
  2. *No se corta el titular* — el titular vive en el tercio inferior-izquierdo (sección 3); a este `object-position`, esa zona del encuadre corresponde al suelo/lámina de agua de la piscina, la zona más uniforme y tranquila de los tres estados — buen lugar para un scrim + texto, no compite con ningún elemento arquitectónico relevante.
  3. *No compite con la zona de mayor contraste* — con una salvedad a verificar en implementación: en el estado noche, la iluminación subacuática de la piscina (un resplandor turquesa) cae justo en la esquina inferior-izquierda, cerca de donde se apoya el scrim del titular. El scrim debe dimensionarse pensando en ese resplandor, no solo en el resto de la imagen — se marca como punto de validación explícito, no como asumido.
  4. *La piscina y la fachada siguen siendo reconocibles* — sí, con claridad, en los tres estados.
  5. *Las luces nocturnas no quedan fuera del encuadre* — sí: la luz interior cálida a través del cristal, la vela/farolillo de la mesa exterior y el resplandor subacuático de la piscina están los tres dentro del encuadre de noche.

  El resto de la composición (titular, CTAs, tira de servicios) reutiliza el patrón de apilado vertical que el Hero actual ya tiene validado por debajo de 901px — no requiere layout nuevo. El valor exacto (70%) puede ajustarse ±2-3 puntos en implementación con dispositivo real sin cambiar el criterio de encuadre.

## 5. Ubicación y escala del logotipo

Sin cambios de posición ni escala respecto al Header actual — wordmark arriba-izquierda, mismo tamaño, mismo comportamiento responsive ya validado en la migración. El único cambio es de contenido: pasa de "REFERENCE / DIGITAL STUDY" a "REFERENCE HOME" (nombre de marca ya aprobado). Es un cambio a nivel de Header (componente compartido por toda la Home), no específico del Hero, pero se documenta aquí porque es lo primero que se ve dentro de este fotograma.

## 6. Titular — definitivo

**"Hay viviendas que solo necesitan ser vistas de otra manera."**

"de otra manera" lleva el tratamiento serif-itálico (regla tipográfica ya establecida: sans-bold para la cláusula estructural, serif-itálica para la palabra de matiz); el resto del titular en sans-bold. Habla de la promesa de Reference Home — que una vivienda cambia cuando se presenta con criterio — y deja que la luz actúe como metáfora silenciosa del propio recurso visual, sin describirlo. Cierra la deliberación abierta en la revisión anterior de este documento (que ofrecía tres propuestas); esta versión la sustituye como definitiva.

## 7. Texto secundario

**"Diseñamos la estrategia, la imagen y el proceso de venta para que cada propiedad alcance todo su valor."**

Definitivo. Conecta directamente el titular (una forma distinta de ver la vivienda) con la propuesta operativa de Reference Home (estrategia + imagen + proceso de venta), sin vocabulario de agencia digital.

## 8. CTA

Dos CTA, con pesos distintos — ya no uno solo exploratorio:

- **CTA principal — "Valora tu vivienda".** Botón circular magnético (`useMagnetic`, mecanismo conservado), abajo-derecha. A diferencia de la versión anterior de este documento, deja de ser puramente exploratorio: adelanta al Hero la conversión temprana que el masterplan sitúa en la sección Valoración (punto 4 de la historia de negocio) — es coherente con la regla de no repetir CTA en forma ni tono (`docs/REFERENCE_HOME_HOME_REDESIGN_MASTERPLAN.md`, sección 6), porque en Valoración (03) el mismo CTA aparece en su contexto de servicio completo, no como botón flotante. **Nota de consistencia:** esto matiza la sección 6 del masterplan, que describía el CTA del Hero como "invitación exploratoria, no de conversión" — se anota aquí en vez de reescribir el masterplan sin instrucción explícita; ambos documentos deben leerse juntos hasta que se homogenice.
- **CTA secundario — "Descubre cómo trabajamos".** Enlace de texto discreto (subrayado + flecha), junto al bloque de titular/texto secundario — el verdadero CTA exploratorio, de menor peso visual que el botón circular. Sustituye cualquier fórmula tipo "Hablemos de tu proyecto" — no hay proyecto, hay una vivienda y un proceso de venta.

## 9. Tratamiento del header

Los tres estados de fondo tienen contraste muy distinto en la franja donde vive el header: cielo azul brillante de día (necesita texto oscuro), naranja de atardecer (contraste intermedio), azul-noche oscuro de noche (necesita texto claro). Alternar el tono del header dinámicamente según el progreso del scroll añadiría un cambio de tono a mitad de Hero que puede sentirse brusco.

**Recomendación:** un scrim constante y sutil (degradado oscuro de arriba hacia abajo, pocos puntos de opacidad, limitado a la franja donde vive el header) presente en los tres estados por igual, de modo que el header pueda mantener **un único tono claro** (wordmark y nav en color crema) durante todo el Hero, sin depender de que el cielo fotográfico coopere en cada instante. Es el mismo principio que el scrim del titular (sección 3) aplicado al header. Alternativa descartada: alternar `data-header-tone` según el progreso — se descarta porque introduce un cambio de tono a mitad de sección que ninguna otra parte del sitio hace dentro de una misma sección.

## 10. Recorrido del scroll

El Hero ocupa su propia distancia de scroll (recomendado 180-220vh, siguiendo el mismo patrón `clamp((scrollY - start) / distance, 0, 1)` ya usado en Proyectos/Operación insignia/Prueba y confianza). Durante ese recorrido:

- El fondo hace crossfade día → atardecer → noche (mecánica exacta en sección 11).
- El punto de luz se desplaza en sincronía con el mismo progreso (sección 12).
- Wordmark, titular, CTA y tira de servicios **permanecen fijos en su lugar** durante todo el recorrido — sin parallax ni desplazamiento propio — para mantener la "composición limpia" que pide el encargo. El único elemento que se mueve es el punto de luz.
- En el último tramo del recorrido (progreso ~0.9-1.0), un desvanecimiento suave conecta la noche ya resuelta con la entrada de Manifesto (sección 13).

## 11. Transición día → atardecer → noche

Se implementa como **dos crossfades secuenciales**, no un mezclado simultáneo de las tres capas — mezclar tres imágenes a la vez con opacidades lineales produce solapes turbios; encadenar dos transiciones limpias (día↔atardecer, luego atardecer↔noche) mantiene como máximo dos capas visibles en cualquier instante:

- Progreso 0.0 → 0.5: `hero-dia.png` se desvanece mientras `hero-atardecer.png` aparece.
- Progreso 0.5 → 1.0: `hero-atardecer.png` se desvanece mientras `hero-noche.png` aparece.
- Easing: `easeInOutCubic` (reutilizado de `motion/core/easing.ts`, ya compartido por WorkZoom/BrandStory).

## 12. Comportamiento del punto de luz

Un elemento gráfico decorativo (`aria-hidden`), un resplandor radial cálido — reutilizando la técnica del halo de gradiente que ya existe en el Hero actual, reconvertida de puramente decorativa a funcional. Se desplaza a lo largo de un arco suave por la franja de cielo: posición alta/central en progreso 0 (sol de mediodía), descendiendo hacia la derecha conforme avanza el atardecer, hasta atenuarse o transformarse en un resplandor más frío y tenue (luna, o el reflejo de las luces de la vivienda) en progreso 1. Su posición está gobernada por el mismo valor de progreso que dirige el crossfade de fondo — luz de la imagen y punto de luz nunca pueden desincronizarse porque comparten la misma variable.

## 13. Duración y progresión de cada estado

Tres estados clave a progreso 0 / 0.5 / 1.0 (día / atardecer / noche), con interpolación continua entre ellos — no hay "estados estáticos que se mantienen" en ningún tramo intermedio, es una transición constante a lo largo de toda la distancia de scroll del Hero. Distancia recomendada: 180-220vh, lo bastante larga para que la transición se perciba pausada y deliberada, sin llegar a sentirse como relleno.

## 14. Entrada y salida hacia la siguiente sección

**Entrada:** al cargar la página (progreso 0, estado día), el Hero aparece con el mismo mecanismo de entrada que ya gestiona el Preloader actual — sin cambios. **Salida:** en el tramo final del recorrido (sección 10), la noche ya completamente resuelta se atenúa un grado más justo antes de ceder el paso a Manifesto — que, por diseño (`docs/REFERENCE_HOME_HOME_REDESIGN_MASTERPLAN.md`, sección 5), no lleva fotografía. Ese contraste (fotografía nocturna → tipografía pura) debe sentirse como una respiración, no como un corte — se recomienda un breve solape de desvanecimiento en vez de un corte duro entre ambas secciones.

## 15. Comportamiento con `prefers-reduced-motion`

Sin crossfade ni desplazamiento del punto de luz. Se muestra un único estado estático — se recomienda **atardecer**, por ser el de mejor equilibrio de contraste y calidez entre los tres (evita el azul muy brillante del día, que exige más contraste en el titular, y evita la oscuridad del estado noche, que dificulta más la lectura del wordmark). El resto de la composición (titular, CTA, tira de servicios) se mantiene igual, sin animación. Coherente con el comportamiento ya validado en el resto del sitio.

## 16. Estrategia de carga y rendimiento

Los tres archivos actuales (PNG, ~1.86-2.06 MB cada uno, ~5.9 MB en total) **no son aptos para servirse tal cual**. Plan:

1. **Formato:** recodificar a AVIF (formato principal) con WebP como fallback — para fotografía de este tipo, es razonable esperar una reducción del 70-90% de peso sin pérdida perceptible de calidad (cada imagen debería quedar en un rango aproximado de 150-400 KB).
2. **Tamaños responsivos:** generar variantes por ancho (móvil ~800px, tablet ~1400px, desktop ~1920px, y una variante de alta densidad ~3200px+ para pantallas retina/ultra-anchas — ver el riesgo de resolución de la sección 0) servidas vía `srcset`/`next/image`.
3. **Prioridad de carga:** la imagen de día (primer fotograma visible, candidata a LCP) se carga con prioridad alta (`fetchpriority="high"` / `priority` de `next/image`). Atardecer y noche no son necesarias en el primer pintado, pero deben empezar a precargarse inmediatamente después del primer render (no esperar a que el usuario haga scroll) para que estén listas antes de que el progreso las necesite — evita el "pop-in" de una imagen que tarda en llegar a mitad de transición.
4. **Resolución fuente:** antes de producción final, confirmar o regenerar un máster de mayor resolución (recomendado ≥3200px de ancho) para las pantallas de mayor densidad — las imágenes actuales (1916px) son válidas para desarrollo y para la mayoría de pantallas estándar, pero se quedan cortas en monitores grandes/retina.

## 17. Criterios de accesibilidad y contraste

- El titular y el CTA se apoyan en un scrim oscuro constante (secciones 3 y 9), no en la luminosidad variable de la fotografía — esto permite fijar **un único color de texto (crema) durante todo el Hero**, con contraste garantizado por el scrim en los tres estados, en vez de tener que recalcular contraste por estado.
- El anillo de foco del CTA usa el token de foco "sobre fondo oscuro" ya definido en `docs/PALETA_CORPORATIVA.md` (dorado mostaza) — la zona donde vive el CTA es, por diseño, siempre oscura gracias al scrim.
- El punto de luz es puramente decorativo (`aria-hidden="true"`), no debe interferir con el orden de lectura ni de tabulación.
- Objetivo táctil del CTA ≥44×44px en móvil.
- El fondo fotográfico no lleva texto alternativo propio más allá de lo que ya declare el `<img>`/`next/image` de fondo (imagen decorativa de fondo, `alt=""`, ya que el mensaje se transmite por el titular en texto real, no por la imagen).
- **Punto de validación específico de móvil (sección 4):** en el estado noche, el resplandor subacuático de la piscina cae cerca del scrim del titular a `object-position: 70%`. El scrim debe dimensionarse contemplando ese resplandor explícitamente — se valida con contraste medido real sobre el recorte de noche, no se asume por el diseño general del scrim.
- Los dos CTA del Hero (sección 8) deben distinguirse también por accesibilidad, no solo por peso visual: el principal ("Valora tu vivienda") es un elemento interactivo de primer nivel (botón), el secundario ("Descubre cómo trabajamos") un enlace — deben anunciarse con roles semánticos distintos, no ambos como botones.

## 18. Qué se conserva de la implementación actual

- El hook `useMagnetic` para el CTA circular.
- La técnica de resplandor radial (antes puramente decorativa, ahora reconvertida en el punto de luz funcional).
- El patrón de progreso de scroll `clamp((scrollY - start) / distance, 0, 1)` y el easing compartido (`motion/core/easing.ts`).
- El wordmark y la nav del Header (solo cambia el texto del wordmark).
- La disposición general del Hero (wordmark, nav, eyebrow, titular inferior-izquierdo, CTA inferior-derecho, tira de servicios en la base) y su comportamiento responsive ya validado por debajo de 901px.

## 19. Qué se elimina

- El fondo de gradiente de color plano como imagen de fondo del Hero.
- El titular y subtítulo actuales (registro de agencia digital).
- Cualquier referencia a servicios digitales en la tira de servicios del pie del Hero.

## 20. Riesgos técnicos

1. **Resolución fuente insuficiente para pantallas grandes/retina** (sección 0) — mitigación: reexportar a mayor resolución antes de producción final.
2. ~~Proporción 21:9 muy panorámica frente a viewports móviles muy verticales~~ — **resuelto**: `object-position: 70% center` verificado con recortes reales sobre los tres estados de luz (sección 4). Riesgo residual menor: el valor se fijó sobre un emulador de viewport (390×844), pendiente de una confirmación rápida en dispositivo físico antes de cerrar la implementación.
3. **Peso combinado inaceptable en su formato actual** (~5.9 MB) — mitigación: AVIF/WebP + tamaños responsivos (sección 16).
4. **Sincronización de tres capas de crossfade + punto de luz + resto del shell** (header, cursor, preloader) sin introducir jank — mitigación: reutilizar el patrón `requestAnimationFrame`/`waitForStable()` ya validado en la suite de Playwright existente para las capturas de validación.
5. **Contraste de texto sobre fondo fotográfico cambiante** — mitigado por el scrim constante (secciones 3, 9 y 17), con un punto de atención específico en el resplandor de piscina nocturno en móvil (sección 17).
6. **Oráculo de regresión visual:** las capturas Playwright necesitarán fijar un scrollY concreto por estado (día/atardecer/noche), igual que ya se hace hoy con Proyectos/Operación insignia/Prueba y confianza — no es un riesgo nuevo, es aplicar un patrón ya conocido.
7. **CTA principal ahora es de conversión, no solo exploratorio** (sección 8) — matiza la sección 6 del masterplan; riesgo bajo pero documental: ambos ficheros deben leerse juntos hasta que se homogenicen explícitamente.

## 21. Plan de implementación y validación

Con copy y encuadre móvil ya cerrados (sección 22), este plan queda en condiciones de ejecutarse en cuanto se apruebe la versión final del documento — no antes.

**Fase A — Activos.**
1. Recodificar las tres imágenes a AVIF (principal) + WebP (fallback); generar variantes responsivas (móvil ~800px, tablet ~1400px, desktop ~1920px, alta densidad ~3200px+).
2. Confirmar o solicitar un máster de mayor resolución si la calidad a 3200px+ no es aceptable reescalando desde los 1916px actuales.
3. Confirmar `object-position: 70% center` en al menos un dispositivo móvil físico (no solo emulador) — el único punto de la sección 4 que queda pendiente de confirmación real.

**Fase B — Estructura visual.**
4. Implementar el fondo de tres capas con crossfade secuencial dirigido por scroll (sección 11), reutilizando `clamp((scrollY - start) / distance, 0, 1)` y `easeInOutCubic`.
5. Implementar el punto de luz sincronizado con el mismo progreso (sección 12), reconvirtiendo el halo radial ya existente.
6. Implementar el scrim constante (titular + header, secciones 3, 9 y 17), con atención específica al resplandor de piscina nocturno en móvil.

**Fase C — Contenido e interacción.**
7. Aplicar el copy definitivo (secciones 6-7) y los dos CTA (sección 8) — principal circular magnético + secundario de texto, con roles semánticos distintos (botón vs. enlace).
8. Actualizar el wordmark del Header a "REFERENCE HOME" (sección 5).
9. Adaptar la tira de servicios del pie del Hero — contenido pendiente de definir aparte (sección 23), no bloquea el resto de esta fase.

**Fase D — Responsive y accesibilidad.**
10. Adaptar y probar tablet; confirmar el encuadre móvil ya cerrado en dispositivo real (punto 3).
11. Implementar el estado estático de `prefers-reduced-motion` (atardecer, sección 15).
12. Medir contraste real (no solo calculado) en los tres estados, incluyendo el punto de atención de la sección 17.

**Fase E — Validación de cierre.**
13. Lint, build, Playwright en los 5 viewports habituales.
14. Capturas de oráculo en los tres estados (0/50/100% del progreso) por viewport, siguiendo el mismo patrón ya usado en Proyectos/Operación insignia/Prueba y confianza.
15. Medir peso de carga real y LCP tras la optimización de la Fase A.
16. Informe de cierre de esta sub-fase antes de continuar con la siguiente sección del roadmap (Valoración).

---

## 22. Estado de las decisiones pendientes (actualizado 2026-07-26)

Las dos cuestiones que quedaban abiertas tras la primera versión de este documento están cerradas:

1. **Copy definitivo** (secciones 6-8) — cerrado: titular, texto secundario, CTA principal y CTA secundario ya son definitivos, no propuestas.
2. **Encuadre móvil definitivo** (sección 4) — cerrado: `object-position: 70% center`, verificado con recortes reales sobre los tres estados de luz contra los cinco criterios pedidos.

## 23. Qué no resuelve este documento

- No fija el contenido final de la tira de servicios del pie del Hero.
- No confirma el `object-position` móvil en dispositivo físico (pendiente, riesgo 2 de la sección 20) — solo en emulador de viewport.
- ~~No homogeniza el masterplan con el nuevo rol de conversión del CTA principal~~ — resuelto 2026-07-26: `docs/REFERENCE_HOME_HOME_REDESIGN_MASTERPLAN.md` secciones 5 y 6 actualizadas para reflejar que el Hero ya no es exclusivamente exploratorio.
