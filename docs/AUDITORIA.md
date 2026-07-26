# Auditoría de la Home actual y plan maestro de transformación

**Estado:** Documento de análisis. No implica ningún cambio de código.
**Fecha:** 2026-07-25.
**Alcance:** la Home migrada (`src/app/page.tsx` y todo lo que cuelga de ella), tal y como quedó al cierre formal de la migración de paridad estricta (`docs/MIGRACION.md`, Fase 16). `web-nueva/` ya no es la referencia de trabajo — este documento evalúa la Home **como producto propio**, no como copia de otra cosa.
**Método:** inspección visual directa (capturas a 1600×1000 y 390×844, incluyendo estados intermedios de scroll en las secciones con animación dirigida por progreso) más lectura del código y copy tal y como se sirven hoy.
**Objetivo:** dar base a la nueva etapa anunciada — "transformar esta base en la verdadera web de Reference Home" — con un diagnóstico sección a sección y un plan maestro priorizado, antes de tocar una sola línea de código.

---

## 0. Diagnóstico global (antes de entrar sección a sección)

Hay un patrón que atraviesa casi toda la Home y que conviene nombrar una sola vez en vez de repetirlo doce veces: **el esqueleto técnico y de composición es sólido y ambicioso; el contenido que lo rellena es, todavía, literalmente el de una plantilla de demostración.** No es una opinión — la propia web lo declara:

- ProjectsGallery: *"Una colección de casos ficticios creados específicamente para esta reconstrucción técnica."*
- Contact: *"El formulario está preparado para conectarse a un servidor PHP convencional. Cambia el correo receptor en `config.php`."* — una nota de documentación para desarrolladores, visible en producción, en la sección con más intención de conversión de toda la página.
- Footer: `hola@tudominio.es`, `+34 000 000 000`, "PROYECTO ESTÁTICO LISTO PARA FTP".
- Stats: los cuatro indicadores son metaformación sobre la propia construcción del sitio (componentes reutilizables, dependencias obligatorias), no argumentos de venta para un cliente.

Ninguno de estos cuatro puntos es un problema de diseño: son placeholders de plantilla que nunca se sustituyeron porque, hasta ahora, el objetivo era paridad con el original, no verdad de marca. Ahora que empieza la fase de creación, este es el hallazgo más importante de toda la auditoría: **antes de rediseñar composición, hay contenido que ni siquiera pretende ser real todavía.**

Otros patrones globales:

- **Identidad verbal inconsistente**: el proyecto se llama "Reference Home" en la conversación de trabajo, pero en pantalla aparece como "Reference Study" (título, footer) y "REFERENCE / DIGITAL STUDY" (wordmark del header). Antes de cerrar el Hero definitivo (roadmap punto 1) hace falta decidir el nombre real y aplicarlo de forma consistente en las tres apariciones.
- **Paleta**: crema cálido de fondo, tinta casi negra, amarillo ácido y granate/vino como acentos, con algún verde oliva puntual. Es distintiva, se repite con disciplina en todas las secciones y es uno de los activos más fuertes del sitio tal cual está — se recomienda conservarla como base de la dirección de arte definitiva.
- **Tipografía**: un recurso de mezcla sans bold + serif itálica dentro del mismo titular, repetido en Hero, Process, BrandStory, Principles y Stats. Es coherente y reconocible; funciona como firma tipográfica del sitio. Vale la pena mantenerlo como sistema, no como coincidencia.
- **Ritmo de scroll**: la página encadena **tres mecánicas de scroll dirigido por progreso (pinned/sticky) seguidas** en el tercio central — ProjectsGallery, WorkZoom y BrandStory — con Process como único respiro real entre la primera y la segunda. Cada una obliga a desplazarse bastante más de una pantalla para "liberar" la siguiente sección. Es el riesgo estructural más claro de la Home: fatiga de scroll acumulada, y tres variaciones del mismo gesto ("vas revelando algo a medida que avanzas") compitiendo por la misma sensación de "momento wow". Se retoma en el plan maestro (punto 6 del roadmap).
- **CTA**: existe un único camino de conversión real (el formulario de Contact, al final de una página larga) y ningún CTA persistente en el header ni a media página. "Hablemos de tu proyecto" en WorkZoom es el único punto intermedio.
- **Imágenes/mockups**: todo el "trabajo" mostrado (ProjectsGallery, WorkZoom, panel de Solutions) son maquetas de dispositivo (browser/tablet) con marcas inventadas (Atelier Norte, Forma Habitable, Casa Serena) y pantallas de relleno. Coherente entre sí, pero es exactamente lo que el roadmap ya identifica como pendiente (puntos 3 y 4).
- **Accesibilidad**: lo validado hasta ahora (`reduced-motion`, navegación por teclado, foco) es paridad funcional con el original, no una auditoría de accesibilidad del rediseño. Al tocar composición/tipografía/contraste habrá que revalidar contraste de color (texto sobre amarillo ácido y sobre granate) y orden de tabulación dentro de las secciones "pinned", que son las más propensas a atrapar el foco.

---

## 1. Header / MobileMenu / Preloader / NoiseOverlay / CustomCursor (shell transversal)

| | |
|---|---|
| **Qué funciona** | Header con cambio de tono claro/oscuro según sección; wordmark + "Based in Valencia" + nav a la derecha, limpio y minimal; cursor personalizado y textura de ruido dan una capa de tacto sin distraer; el badge superíndice junto a "Proyectos" (nº de proyectos) es un detalle editorial simpático. |
| **Qué no funciona** | El nombre de marca cambia entre "Reference" (wordmark), "Digital Study" (subtítulo del wordmark) y "Reference Study" (`<title>`, Footer) — no hay una identidad verbal única todavía; el header no ofrece ningún punto de conversión (ni CTA ni acceso directo a contacto) durante todo el recorrido, solo un link de texto "Contacto" al final de la nav. |
| **Qué mantendrías** | Sistema de tono claro/oscuro, cursor a medida, ruido de fondo, posición y jerarquía del wordmark. |
| **Qué eliminarías** | Nada a nivel estructural. |
| **Qué transformarías** | Fijar el nombre de marca definitivo y aplicarlo de forma idéntica en wordmark, `<title>` y Footer; valorar un CTA visible en el header (aunque sea un botón "Contactar" persistente) para no depender de un único punto de conversión al final de la página. |
| **Prioridad** | **Alta** (identidad verbal — condiciona todo lo demás) / Media (CTA en header). |

---

## 2. Hero

| | |
|---|---|
| **Qué funciona** | Titular con la mezcla sans bold + serif itálica ("Más que una experiencia *& digital*") muy bien resuelta visualmente; halo de gradiente (rosa/amarillo) como único elemento gráfico, discreto y elegante; CTA circular magnético "EXPLORAR"; tira de servicios al pie que ancla el alcance del estudio sin ocupar espacio. |
| **Qué no funciona** | El copy es genérico de agencia — "Más que una experiencia & digital" y "Diseñamos un lenguaje digital donde estrategia, tecnología y dirección creativa trabajan como una sola pieza" podrían estar en la home de cualquier estudio. No dice nada específico de Reference Home. |
| **Qué mantendrías** | Composición completa, el halo de gradiente, el CTA magnético, el tratamiento tipográfico mixto. |
| **Qué eliminarías** | El copy actual (titular y subtítulo). |
| **Qué transformarías** | Titular y subtítulo por la propuesta de valor real de Reference Home; revisar si la lista de servicios del pie sigue siendo la definitiva. |
| **Prioridad** | **Alta** — es el punto 1 explícito del roadmap ("Hero definitivo"). |

---

## 3. Manifesto (declaración con reveal palabra a palabra)

| | |
|---|---|
| **Qué funciona** | El reveal palabra a palabra marca una pausa de lectura muy bien calibrada entre el Hero y Solutions; es, con diferencia, el copy más logrado de toda la Home — "Hacer crecer una marca exige criterio. Creamos sistemas visuales que convierten cada desplazamiento en una decisión y cada detalle en una señal de calidad." tiene voz propia, no suena a plantilla. |
| **Qué no funciona** | Al no tener ningún apoyo visual, en dispositivos de gama baja puede sentirse como un interludio plano si el reveal no es perfectamente fluido (ya validado técnicamente, pero es el único riesgo de la sección). |
| **Qué mantendrías** | Mecánica de reveal y el tono de voz del copy. |
| **Qué eliminarías** | Nada. |
| **Qué transformarías** | Ajustar el texto final si cambia el posicionamiento de marca, pero conservando este registro — es el que debería marcar el tono para reescribir el resto del copy del sitio. |
| **Prioridad** | Media. |

---

## 4. Solutions (acordeón de servicios)

| | |
|---|---|
| **Qué funciona** | Mecánica de acordeón clara, titular serif-itálico contundente ("Soluciones que dan *resultado*"), bloque de acento amarillo ácido que rompe el negro sin ruido. |
| **Qué no funciona** | El panel de cada servicio muestra una maqueta de dispositivo con contenido de relleno genérico (bloque "DEVELOPMENT", líneas grises) que no representa nada real; conviene confirmar que los 4 servicios listados (Dirección digital, Desarrollo web, Identidad de marca, Contenido editorial) siguen siendo el catálogo real de Reference Home. |
| **Qué mantendrías** | Mecánica de acordeón, tratamiento del titular. |
| **Qué eliminarías** | Las maquetas de panel con contenido de relleno. |
| **Qué transformarías** | Arte del panel por dirección de arte propia (roadmap punto 3); validar el listado de servicios contra la oferta real. |
| **Prioridad** | Media-Alta (depende directamente del punto 3 del roadmap). |

---

## 5. ProjectsGallery

| | |
|---|---|
| **Qué funciona** | Scroll horizontal dirigido por progreso con tarjetas de proyecto muy bien resueltas tipográficamente (títulos legibles incluso a medio tránsito); lenguaje visual de maqueta de navegador con degradado granate es distintivo; microinteracción "ABRIR" al hover en desktop. |
| **Qué no funciona** | Los casos son explícitamente ficticios (lo dice el propio copy de la sección) con marcas inventadas y pantallas de relleno; es la primera de tres mecánicas de scroll-progreso seguidas, lo que empieza a acumular fatiga si no se diferencia bien de WorkZoom, que usa un gesto muy parecido poco después. |
| **Qué mantendrías** | El lenguaje visual de maqueta de dispositivo (es un activo reconocible) y la mecánica de tarjetas horizontales. |
| **Qué eliminarías** | Los proyectos ficticios y su copy de "reconstrucción técnica". |
| **Qué transformarías** | Sustitución completa por casos reales de Reference Home (roadmap puntos 3 y 4); repensar si esta sección y WorkZoom deben seguir siendo dos versiones del mismo gesto o diferenciarse más (una como índice, otra como inmersión en un único proyecto insignia). |
| **Prioridad** | **Alta** — roadmap puntos 3 y 4 explícitos. |

---

## 6. Process

| | |
|---|---|
| **Qué funciona** | Sección a pantalla completa en negro, muy segura de sí misma; titular mixto ("La excelencia está en los *detalles*") de los mejores del sitio; cuatro columnas (Descubrir, Definir, Diseñar, Desarrollar) con copy conciso y ya casi definitivo — es una de las secciones más "terminadas" tal cual está. |
| **Qué no funciona** | Frente a las secciones vecinas (ProjectsGallery antes, WorkZoom después), es la única sin firma de movimiento propia — funciona como respiro, pero un respiro demasiado plano puede notarse como un bajón de energía en vez de una pausa intencionada. |
| **Qué mantendrías** | Titular, estructura de 4 pasos, tono del copy — está muy cerca de ser definitivo tal cual. |
| **Qué eliminarías** | Nada. |
| **Qué transformarías** | Considerar una firma de movimiento ligera (línea de progreso, paso activo resaltado al hacer scroll) que la conecte mejor con el resto sin convertirla en una cuarta mecánica de scroll-progreso. |
| **Prioridad** | Media — es el punto 5 del roadmap, pero de las secciones que menos trabajo de fondo necesitan. |

---

## 7. WorkZoom

| | |
|---|---|
| **Qué funciona** | El momento de inmersión (el marco de dispositivo escala hasta llenar el viewport y el header pasa a modo oscuro real) es el "wow" técnico más ambicioso de la Home; el motivo de brújula conecta bien temáticamente con BrandStory más adelante. |
| **Qué no funciona** | Mismo problema de contenido ficticio (Atelier Norte / Forma Habitable) que ProjectsGallery; es la sección con más deuda técnica conocida — la condición de carrera de visibilidad del header está documentada y aislada, no corregida (ver `docs/MIGRACION.md`, Fase 9-10), lo que la hace la pieza más frágil si se amplía; usa el mismo lenguaje de "maqueta de dispositivo que se revela con el scroll" que ProjectsGallery, lo que empieza a sentirse repetitivo tan seguido. |
| **Qué mantendrías** | La mecánica de inmersión por zoom como momento de firma — pero como único momento de este tipo en la página. |
| **Qué eliminarías** | El proyecto ficticio. |
| **Qué transformarías** | Sustituir por un caso real insignia de Reference Home (roadmap punto 3); diferenciar más claramente su propósito respecto a ProjectsGallery para que no compitan por la misma idea. |
| **Prioridad** | **Alta** (contenido, roadmap punto 3) — con nota de deuda técnica a vigilar si se amplía la sección. |

---

## 8. BrandStory

| | |
|---|---|
| **Qué funciona** | Motivo de aguja de brújula muy elegante y con recorrido narrativo propio en 3 pasos ("Tus ideas historias" → iconos de paso → "…se transforman en historias de marca"); fondo de degradado que hila visualmente todo el arco "de la idea al lanzamiento"; la palabra de cierre en granate ("de Marca") aterriza bien como resolución cromática. |
| **Qué no funciona** | El contenido narrativo es, de nuevo, genérico de proceso de agencia ("Descubrir & Definir", "Observar · Ordenar") en vez de contar algo específico de cómo trabaja Reference Home; es la tercera mecánica de scroll-progreso consecutiva — para cuando el usuario llega aquí ya ha hecho el mismo gesto de "desplázate para revelar" dos veces. |
| **Qué mantendrías** | Motivo de brújula, paleta de degradado, estructura narrativa en 3 pasos. |
| **Qué eliminarías** | Nada estructural. |
| **Qué transformarías** | Copy narrativo hacia algo específico de la marca, no genérico de proceso; valorar si esta sección se solapa demasiado con Process (ambas cuentan "cómo trabajamos" en pasos) y si conviene diferenciarlas más o fusionar la narrativa. |
| **Prioridad** | Media — no es un punto explícito del roadmap, pero conecta directamente con el punto 6 ("ritmo... y microinteracciones"). |

---

## 9. Principles

| | |
|---|---|
| **Qué funciona** | El giro a amarillo ácido a pantalla completa es el reset de ritmo más eficaz de toda la Home después de tres secciones cálidas/oscuras seguidas; la frase destacada — "Una experiencia no se mide por cuánto se mueve, sino por cómo guía." — es la línea más afinada y con más carácter de marca de todo el sitio, mejor incluso que el titular del Hero; lista de reveal (Más claridad, Más valor…) legible y tranquila. |
| **Qué no funciona** | Nada relevante — es de las secciones más resueltas tal cual está. |
| **Qué mantendrías** | Todo: el golpe de paleta, la frase destacada, la mecánica de reveal, la estructura de lista. |
| **Qué eliminarías** | Nada. |
| **Qué transformarías** | Ajustes de copy menores si cambia el posicionamiento general, nada urgente. Vale la pena usar el tono de esta frase como referencia al reescribir el Hero. |
| **Prioridad** | **Baja**. |

---

## 10. Stats

| | |
|---|---|
| **Qué funciona** | Animación de contador ascendente, grid de 4 métricas limpio, el detalle del sufijo "+" da autenticidad al número. |
| **Qué no funciona** | Las cuatro métricas ("45 Componentes reutilizables", "7 Casos visuales originales", "100% Responsive", "0 Dependencias obligatorias") son datos sobre la construcción técnica del propio sitio, no argumentos de venta para un cliente que llega a la Home. Es el desajuste de contenido más claro y más fácil de corregir de toda la auditoría. |
| **Qué mantendrías** | Mecánica de contador, layout de grid, tratamiento del "+". |
| **Qué eliminarías** | El set de métricas actual, completo. |
| **Qué transformarías** | Sustituir por métricas reales de negocio/marca (años de trayectoria, proyectos entregados, clientes, premios — lo que sea cierto y relevante) cuando existan; si no existen todavía, valorar si esta sección debe existir en el Hero definitivo o esperar a tener datos reales. |
| **Prioridad** | **Alta** — impacto alto, esfuerzo bajo. |

---

## 11. Contact

| | |
|---|---|
| **Qué funciona** | Sección en granate con mucha presencia, titular mixto "Empieza tu proyecto hoy" bien resuelto, campos de formulario con estilo limpio, comportamiento simulado conservado deliberadamente (correcto para esta etapa, según lo ya acordado). |
| **Qué no funciona** | La frase "El formulario está preparado para conectarse a un servidor PHP convencional. Cambia el correo receptor en `config.php`." es una nota de documentación de desarrollador, visible para cualquier visitante, en la sección con más intención de conversión de la página — es la señal de "esto es una plantilla" más evidente de todo el sitio; el link de política de privacidad no tiene destino real todavía. |
| **Qué mantendrías** | Composición, titular, estilo de campos. |
| **Qué eliminarías** | La frase sobre `config.php` — de forma inmediata, es la corrección de contenido más urgente de toda la Home, independiente del calendario del resto del rediseño. |
| **Qué transformarías** | Copy de apoyo por algo dirigido al visitante, no al desarrollador; conectar el envío real cuando corresponda (fuera de alcance de esta fase, ya acordado). |
| **Prioridad** | **Alta** — y candidata a corregirse antes incluso de empezar el resto del rediseño, por ser contenido claramente roto de cara al usuario. |

---

## 12. Footer

| | |
|---|---|
| **Qué funciona** | Estructura de 3 columnas (Enlaces / Contacto / Legal) clara, wordmark oversized que cierra visualmente el recorrido igual que lo abrió el Header, affordance "Volver arriba". |
| **Qué no funciona** | Datos de contacto de plantilla (`hola@tudominio.es`, `+34 000 000 000`) y la línea "PROYECTO ESTÁTICO LISTO PARA FTP" — misma clase de problema que el `config.php` de Contact: contenido de desarrollador filtrado a producción. |
| **Qué mantendrías** | Estructura de 3 columnas, tratamiento del wordmark de cierre. |
| **Qué eliminarías** | Email, teléfono y tagline de plantilla. |
| **Qué transformarías** | Datos de contacto reales; enlaces legales reales una vez existan las páginas interiores correspondientes. |
| **Prioridad** | **Alta** — mismo nivel de urgencia que Contact, por ser también contenido de plantilla visible. |

---

## 13. Página 404

No se ha vuelto a capturar en esta ronda visual: por diseño (Fase 14 de la migración) es una pieza técnica mínima — Eyebrow "Error 404", titular, texto y enlace de vuelta — deliberadamente sin identidad definitiva, a la espera de que exista el resto del sitio interior. No requiere trabajo ahora.

| | |
|---|---|
| **Prioridad** | Baja — pendiente hasta la fase de páginas interiores, según el propio roadmap (punto 7). |

---

## 14. Plan maestro de transformación (síntesis priorizada)

Reordenando los hallazgos anteriores sobre el roadmap de 7 puntos ya aprobado:

### Antes de rediseñar nada — limpieza de contenido roto (nueva, no estaba en el roadmap original)
Tres piezas de copy son literalmente notas de plantilla visibles en producción y deberían corregirse en cuanto se empiece a tocar código, independientemente del orden del resto del plan:
1. Contact — frase sobre `config.php`.
2. Footer — email/teléfono de plantilla y tagline "listo para FTP".
3. Identidad verbal — unificar "Reference Home" / "Reference Study" / "Digital Study" en un único nombre antes de que se propague a más sitios (Hero, metadatos, redes).

### 1. Hero definitivo
Mantener composición, halo, CTA magnético y el recurso tipográfico mixto. Reescribir titular y subtítulo con la propuesta de valor real. Depende de haber cerrado el nombre de marca.

### 2. Nueva sección de valoración
No existe hoy una sección de prueba social/valoración real — Stats ocupa ese lugar pero con métricas equivocadas (de build, no de negocio). Este punto del roadmap y la corrección de Stats son, en la práctica, el mismo trabajo: decidir qué datos reales respaldan a Reference Home y en qué formato se muestran.

### 3. Sustitución completa de imágenes por dirección de arte propia
Afecta a Solutions (panel de servicio), ProjectsGallery y WorkZoom por igual — las tres secciones comparten hoy el mismo lenguaje de "maqueta de dispositivo con marca inventada". Recomendación: resolver las tres a la vez, ya que comparten sistema visual, en vez de una a una.

### 4. Rediseño de ProjectsGallery
Una vez haya casos reales, aprovechar para decidir su relación con WorkZoom (¿índice vs. inmersión en un único proyecto?) en vez de que sigan siendo dos versiones del mismo gesto.

### 5. Rediseño de Process
De las secciones que menos cambio necesita en contenido; el trabajo aquí es sobre todo de ritmo (ver punto 6) más que de composición o copy.

### 6. Revisión de ritmo de scroll, tipografía, espacios, animaciones y microinteracciones
El hallazgo central para este punto: **tres mecánicas de scroll-progreso consecutivas (ProjectsGallery, WorkZoom, BrandStory)** son el mayor riesgo de fatiga de toda la Home. Antes de pulir tipografía o espaciados, vale la pena decidir a nivel de arquitectura de página cuántos "momentos de inmersión" quiere tener la Home (recomendación: no más de dos) y qué sección cede su mecánica a un scroll convencional. También revisar aquí: solape narrativo entre Process y BrandStory (ambas cuentan "cómo trabajamos" en pasos).

### 7. Optimización final antes de páginas interiores
Sin cambios de alcance respecto al roadmap — pendiente hasta que los puntos 1-6 estén cerrados.

---

## 15. Qué no toca esta auditoría

- No propone diseños, wireframes ni copy final — solo diagnóstico y prioridad.
- No evalúa rendimiento/Lighthouse ni SEO (eso es Fase 15, ya cerrada a nivel técnico mínimo; una revisión de SEO de contenido real es un trabajo posterior, no de esta auditoría).
- No entra en páginas interiores — siguen fuera de alcance, tal y como se ha pedido explícitamente.
