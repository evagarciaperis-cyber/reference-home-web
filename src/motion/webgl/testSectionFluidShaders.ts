// Shaders de la revelación WebGL de TestSection (2026-08-19, primera
// integración visual real de Three.js -- ver useTestSectionFluidReveal.ts).
// GLSL ES 1.00 (compatible con THREE.ShaderMaterial por defecto, sin
// WebGL2 explícito). Dos pasadas:
//  - trailFragmentShader: actualiza un render target auxiliar (la
//    "estela") -- se renderiza sobre sí mismo cada frame (ping-pong):
//    decae lo que ya había y, mientras hay actividad, funde 5 masas SDF
//    (cabeza, cuerpo, cola, lóbulo lateral, microprotuberancia -- ver
//    comentarios dentro de la función) con smooth-min en una única
//    silueta biomórfica, más hasta 4 microgotas (3 categorías de tamaño
//    real, pequeña/mediana/grande) naciendo desde la cola o el lóbulo
//    lateral. No existe ningún núcleo radial único: la forma
//    nace de la UNIÓN de varias masas asimétricas, nunca de un solo
//    centro. Con el cursor quieto (uIntensity~0), un "idle morph" hace
//    respirar/derivar cada masa con senos de baja frecuencia desfasados
//    (nunca vibración) -- se atenúa solo (smoothstep sobre uIntensity)
//    en cuanto vuelve el movimiento real, sin salto. Todo determinista --
//    nunca Math.random()/aleatoriedad real por frame, solo hash()/
//    noise()/sin() de (tiempo, índice fijo).
//  - compositeFragmentShader: la pasada visible -- mezcla blanco
//    (transparente, en realidad: alpha 0 para que el fondo blanco real
//    del DOM se vea) con la fotografía (object-fit:cover replicado a
//    mano) según esa estela. 2026-08-20: ya NO pinta texto (el uniform
//    uText y su textura Canvas 2D se eliminaron por completo -- las
//    métricas nunca coincidían con el texto HTML real). El texto blanco
//    ahora es una capa HTML recortada con mask-image CSS, generada a
//    partir de este mismo canal de estela -- ver
//    useTestSectionFluidReveal.ts.

export const quadVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const trailFragmentShader = /* glsl */ `
  precision mediump float;
  varying vec2 vUv;

  uniform sampler2D uPrevTrail;
  uniform vec2 uResolution;
  uniform vec2 uMouse;
  uniform vec2 uLobeDir;
  uniform float uIntensity;
  uniform float uAdding;
  uniform float uDecay;
  uniform float uTime;
  uniform float uCoreRadius;
  uniform vec3 uDropSizes; // radios representativos: x=pequeña, y=mediana, z=grande (ya en espacio del render target)

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  // Smooth-min polinómico (Inigo Quilez) -- funde varias masas en un
  // único contorno continuo. Esto es lo que evita que la forma final se
  // vea como "varios círculos superpuestos": el resultado es una sola
  // superficie con transiciones curvas entre masas, no una suma de
  // alphas.
  float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
  }

  // Elipse SDF aproximada -- suficiente para un umbral visual (no para
  // raymarching exacto). p y r ya en el mismo espacio de coordenadas.
  float sdEllipse(vec2 p, vec2 r) {
    return (length(p / r) - 1.0) * min(r.x, r.y);
  }

  float sdCapsule(vec2 p, vec2 a, vec2 b, float r) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h) - r;
  }

  void main() {
    vec2 fragPx = vUv * uResolution;
    float prev = texture2D(uPrevTrail, vUv).r * uDecay;

    float stamp = 0.0;
    if (uAdding > 0.5) {
      float dirLen = length(uLobeDir);
      vec2 dir = dirLen > 0.0001 ? uLobeDir / dirLen : vec2(1.0, 0.0);
      vec2 perp = vec2(-dir.y, dir.x);

      // A partir de aquí TODO vive en el marco (along, across) alineado
      // con la dirección de avance -- las elipses quedan orientadas sin
      // rotarlas aparte, y las 5 masas comparten un único sistema de
      // coordenadas (nunca se vuelve a world-space).
      vec2 worldLocal = fragPx - uMouse;
      vec2 local = vec2(dot(worldLocal, dir), dot(worldLocal, perp));
      float R = uCoreRadius;

      // "Idle morph" (2026-08-20) -- con el cursor quieto la mancha
      // sigue viva: cada masa respira/deriva un poco con senos de baja
      // frecuencia (0.2-0.5Hz), desfasados entre sí para no pulsar en
      // simetría. idleFactor se desvanece en cuanto hay movimiento real
      // (smoothstep sobre uIntensity, sin salto) para que la deformación
      // por dirección/velocidad recupere prioridad de forma continua, no
      // con un pop.
      float idleFactor = 1.0 - smoothstep(0.05, 0.35, uIntensity);
      float tau = 6.2831853;
      float breatheHead = sin(uTime * tau * 0.22) * idleFactor;
      float breatheBodyX = sin(uTime * tau * 0.31 + 1.7) * idleFactor;
      float breatheBodyY = sin(uTime * tau * 0.31 + 1.7 + 3.14159265) * idleFactor;
      float driftSideAcross = sin(uTime * tau * 0.38 + 4.2) * idleFactor;
      float driftSideAlong = sin(uTime * tau * 0.27 + 0.6) * idleFactor;
      float breatheTail = sin(uTime * tau * 0.27 + 2.4) * idleFactor;

      // 1) Cabeza -- adelantada, orientada hacia el avance, NO centrada
      // en el cursor. Respira levemente (radio) en reposo.
      vec2 headC = vec2(0.42, 0.06) * R;
      vec2 rHead = vec2(0.50, 0.38) * R * (1.0 + breatheHead * 0.04);

      // 2) Cuerpo -- masa mayor y achatada, con sesgo lateral FIJO: esto
      // es lo que rompe la simetría incluso con el cursor quieto. En
      // reposo se ensancha/estrecha ligeramente (fases opuestas en X/Y,
      // sensación de masa líquida "respirando").
      vec2 bodyC = vec2(-0.05, 0.22) * R;
      vec2 rBody = vec2(0.74 * (1.0 + breatheBodyX * 0.06), 0.50 * (1.0 + breatheBodyY * 0.05)) * R;

      // 3) Cola -- cápsula estrecha hacia atrás, curvada (los dos
      // extremos no están alineados con "across=0"). Se acorta/alarga
      // muy sutilmente en reposo.
      vec2 tailA = vec2(-0.32, 0.10) * R;
      vec2 tailB = vec2(-1.05, -0.08) * R * (1.0 + breatheTail * 0.08);
      float tailR = 0.22 * R;

      // 4) Lóbulo lateral -- al lado OPUESTO del cuerpo (across
      // negativo, el cuerpo está en across positivo): rompe la simetría
      // por el otro flanco. Deriva de posición muy leve en reposo.
      vec2 sideC = vec2(-0.16 + driftSideAlong * 0.04, -0.40 + driftSideAcross * 0.07) * R;
      vec2 rSide = vec2(0.30, 0.25) * R;

      // 5) Microprotuberancia -- deriva lenta y determinista (ruido de
      // muy baja frecuencia en el tiempo, atenuada igual que el resto en
      // cuanto hay movimiento), nunca en la misma posición exacta pero
      // tampoco temblando frame a frame.
      float driftA = noise(vec2(uTime * 0.045, 3.1)) - 0.5;
      float driftB = noise(vec2(uTime * 0.045, 9.7)) - 0.5;
      vec2 bumpC = vec2(0.18 + driftA * 0.08 * idleFactor, 0.32 + driftB * 0.07 * idleFactor) * R;
      vec2 rBump = vec2(0.13, 0.12) * R;

      float dHead = sdEllipse(local - headC, rHead);
      float dBody = sdEllipse(local - bodyC, rBody);
      float dTail = sdCapsule(local, tailA, tailB, tailR);
      float dSide = sdEllipse(local - sideC, rSide);
      float dBump = sdEllipse(local - bumpC, rBump);

      float k = R * 0.32;
      float d = smin(dHead, dBody, k);
      d = smin(d, dTail, k * 0.85);
      d = smin(d, dSide, k * 0.7);
      d = smin(d, dBump, k * 0.4);

      // Ruido de baja frecuencia -- SOLO rompe el borde, no construye la
      // forma (amplitud baja, sin grano, sin vibración: depende de
      // uTime*0.05, deriva lenta).
      float angle = atan(local.y, local.x);
      float edgeWave = noise(vec2(cos(angle) * 1.5, sin(angle) * 1.5) + uTime * 0.05) - 0.5;
      d -= edgeWave * R * 0.05;

      // 2026-08-20: banda de transición mínima -- solo antialiasing
      // técnico, no un halo visible. (Antes R*0.09, ~32px de gradiente
      // en un núcleo típico: eso era el "destello difuminado" reportado,
      // sobre todo visible en movimiento por la acumulación de estelas
      // ya de por sí suaves.)
      float soft = R * 0.025;
      stamp = 1.0 - smoothstep(-soft, soft, d);

      // Microgotas -- hasta 4 a la vez (nunca "motitas": 3 categorías de
      // tamaño real, pequeña/mediana/grande, con variación dentro de
      // cada una), deterministas por (ciclo, índice), naciendo desde la
      // cola o el lóbulo lateral (nunca repartidas alrededor del
      // centro). Radio constante durante la mayor parte de su vida (solo
      // un "brote" rápido al nacer) -- no se van encogiendo hasta ser un
      // punto, así se leen como masas desprendidas, no como polvo.
      for (int i = 0; i < 4; i += 1) {
        float fi = float(i);
        float cycleT = uTime / 0.6 + fi * 0.41;
        float cycleIndex = floor(cycleT);
        float age = fract(cycleT);
        float seed = hash(vec2(cycleIndex, fi + 3.0));
        if (seed < uIntensity * 0.5) {
          vec2 anchor = seed > 0.5 ? tailB : sideC;
          vec2 away = length(anchor) > 0.001 ? normalize(anchor) : vec2(-1.0, 0.0);
          vec2 perpAway = vec2(-away.y, away.x);
          float seed2 = hash(vec2(cycleIndex, fi + 7.0));

          // Categoría de tamaño (pequeña/mediana/grande) + variación
          // interna (+-12%) -- "pocas gotas, pero buenas", con variedad.
          float catSeed = hash(vec2(cycleIndex, fi + 11.0));
          float baseR = catSeed < 0.4 ? uDropSizes.x : (catSeed < 0.75 ? uDropSizes.y : uDropSizes.z);
          float jitterSeed = hash(vec2(cycleIndex, fi + 13.0));
          float dropRFull = baseR * (0.88 + jitterSeed * 0.24);

          vec2 dropPos = anchor + away * mix(0.08, 0.8, age) * R + perpAway * (seed2 - 0.5) * 0.32 * R;

          // Brote rápido al nacer (crece de 30% a 100% de su tamaño),
          // luego mantiene el tamaño -- solo el envelope (alpha) sube y
          // baja, nunca la propia gota se encoge hasta desaparecer.
          float growIn = smoothstep(0.0, 0.16, age);
          float dropR = dropRFull * mix(0.3, 1.0, growIn);
          float envelope = smoothstep(0.0, 0.1, age) * (1.0 - smoothstep(0.62, 1.0, age));

          // Mismo criterio que la masa principal -- borde fino, no una
          // gota difuminada.
          float drop = (1.0 - smoothstep(dropR * 0.85, dropR, length(local - dropPos))) * envelope;
          stamp = max(stamp, drop);
        }
      }
    }

    float value = clamp(prev + stamp, 0.0, 1.0);
    gl_FragColor = vec4(vec3(value), 1.0);
  }
`;

export const compositeFragmentShader = /* glsl */ `
  precision mediump float;
  varying vec2 vUv;

  uniform sampler2D uImage;
  uniform sampler2D uTrail;
  uniform vec2 uResolution;
  uniform vec2 uImageResolution;
  uniform float uRevealStrength;

  void main() {
    float mask = texture2D(uTrail, vUv).r;
    mask = smoothstep(0.16, 0.16 + uRevealStrength, mask);

    float scale = max(uResolution.x / uImageResolution.x, uResolution.y / uImageResolution.y);
    vec2 scaledImg = uImageResolution * scale;
    vec2 offset = (uResolution - scaledImg) * 0.5;
    vec2 imgUv = clamp((vUv * uResolution - offset) / scaledImg, 0.0, 1.0);
    vec3 photo = texture2D(uImage, imgUv).rgb;

    // 2026-08-20: el texto blanco ya NO se pinta aquí (era una textura
    // Canvas 2D que medía el DOM -- sus métricas nunca coincidían
    // exactamente con el texto HTML real). Ahora son dos capas HTML
    // reales, y la copia blanca se recorta con un mask-image CSS
    // generado a partir de este mismo uTrail (ver
    // useTestSectionFluidReveal.ts, updateCssTextMask) -- no hay
    // tipografía en WebGL en ningún punto de este archivo.
    gl_FragColor = vec4(photo, mask);
  }
`;
