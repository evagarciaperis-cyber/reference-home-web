// Shaders del bloque "Nuestro equipo" cinematográfico (2026-08-21,
// useTeamPortraitScene.ts). GLSL ES 1.00, mismo estilo que
// testSectionFluidShaders.ts (precision mediump float, un solo quad a
// pantalla completa dentro de su propio contenedor -- aquí el
// contenedor es el "stage" del retrato, no toda la sección).
//
// Una sola pasada, sin render targets/ping-pong (a diferencia de
// TestSection): el plano recibe DOS texturas (la persona activa y la
// siguiente) y hace crossfade entre ambas según uMix, con:
//  - mapeo tipo object-fit:cover hecho a mano (mismo cálculo que
//    compositeFragmentShader en testSectionFluidShaders.ts, una vez por
//    textura, con su propia resolución nativa);
//  - una aproximación de profundidad NO basada en depth map real (no
//    existen todavía, ver useTeamPortraitScene.ts) sino procedural:
//    más "cerca" cuanto más cerca del centro (donde suele caer el
//    rostro en un retrato de plano medio), decayendo hacia los bordes.
//    Cuando existan depth maps reales, esta función es el único punto
//    a sustituir por una lectura de textura;
//  - paralaje de cursor aplicado con más fuerza en las zonas "lejanas"
//    (bordes) y casi nulo en el centro -- así la cara permanece estable
//    (nunca se mueve el rostro, solo el entorno alrededor);
//  - un ligero cambio de escala por textura (la saliente se aleja un
//    poco, la entrante llega desde un poco más cerca) para dar
//    sensación de profundidad en la transición, no solo un fundido;
//  - un desenfoque muy controlado (4 muestras, sin bucle dinámico)
//    que solo aparece durante el tramo central de la transición
//    (uFocus bajo) y desaparece por completo en reposo (uFocus 1).
// Nada de esto deforma caras ni estira cuerpos: el desplazamiento máximo
// es una fracción de píxel de UV, pensado para leerse como aire/cámara,
// no como efecto.

export const portraitVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const portraitFragmentShader = /* glsl */ `
  precision mediump float;
  varying vec2 vUv;

  uniform sampler2D uTexA;
  uniform sampler2D uTexB;
  uniform vec2 uResolution;
  uniform vec2 uImageResolutionA;
  uniform vec2 uImageResolutionB;
  uniform float uMix;      // 0 = solo A, 1 = solo B
  uniform float uFocus;    // 1 = en reposo (nítido), 0 = mitad de la transición
  uniform vec2 uParallax;  // offset de paralaje por cursor, en unidades de UV (muy pequeño)

  vec2 coverUv(vec2 uv, vec2 imageRes) {
    float scale = max(uResolution.x / imageRes.x, uResolution.y / imageRes.y);
    vec2 scaledImg = imageRes * scale;
    vec2 offset = (uResolution - scaledImg) * 0.5;
    return clamp((uv * uResolution - offset) / scaledImg, 0.0, 1.0);
  }

  // Aproximación de profundidad sin depth map (ver nota arriba): 1.0 en
  // el centro (rostro), decae hacia los bordes (fondo/hombros).
  float approxDepth(vec2 uv) {
    return 1.0 - smoothstep(0.0, 0.62, length(uv - 0.5));
  }

  vec3 sampleSoft(sampler2D tex, vec2 uv, float blur) {
    vec2 o = vec2(blur, blur * 0.7);
    vec3 c = texture2D(tex, uv).rgb;
    c += texture2D(tex, uv + vec2(o.x, o.y)).rgb;
    c += texture2D(tex, uv - vec2(o.x, o.y)).rgb;
    c += texture2D(tex, uv + vec2(-o.x, o.y)).rgb;
    return c * 0.25;
  }

  void main() {
    float depth = approxDepth(vUv);
    // La cara (depth alto) casi no se mueve; el entorno (depth bajo) se
    // desplaza algo más -- nunca al revés, para no marear ni desplazar
    // el rostro.
    vec2 parallaxOffset = uParallax * (1.0 - depth) * 0.035;

    // Escala sutil: la saliente (A) se aleja un poco al crecer uMix, la
    // entrante (B) llega desde un poco más cerca y se asienta en 1.0.
    float scaleA = mix(1.0, 1.035, smoothstep(0.0, 1.0, uMix));
    float scaleB = mix(1.05, 1.0, smoothstep(0.0, 1.0, uMix));

    vec2 uvA = (vUv - 0.5) * scaleA + 0.5 + parallaxOffset;
    vec2 uvB = (vUv - 0.5) * scaleB + 0.5 + parallaxOffset;

    float blur = (1.0 - uFocus) * 0.0028;
    vec3 colorA = sampleSoft(uTexA, coverUv(uvA, uImageResolutionA), blur);
    vec3 colorB = sampleSoft(uTexB, coverUv(uvB, uImageResolutionB), blur);

    vec3 color = mix(colorA, colorB, smoothstep(0.0, 1.0, uMix));

    // Viñeta muy suave -- cámara, no decoración: se acentúa ligeramente
    // durante la transición (uFocus bajo) y casi desaparece en reposo.
    float vignette = smoothstep(0.42, 0.92, length(vUv - 0.5));
    color *= 1.0 - vignette * mix(0.22, 0.1, uFocus);

    gl_FragColor = vec4(color, 1.0);
  }
`;
