import * as THREE from "three";

/**
 * Escena "Una casa, un día" (web nueva, portada).
 *
 * Un único plano a pantalla completa con un shader que:
 *  - pasa de una luz a la siguiente (día → tarde → atardecer → noche) a
 *    través de un frente de humo, no con un fundido uniforme: el cielo
 *    cambia primero y la luz nueva "avanza" por la imagen;
 *  - añade niebla volumétrica (fbm animado) más densa a mitad de cada
 *    transición y en la apertura;
 *  - enciende las luces de la casa por zonas, una a una, al llegar la noche
 *    (máscara = lo que brilla de noche y no al atardecer);
 *  - condensa los titulares desde el humo y los deshace en él.
 *
 * La escena no sabe nada de React: recibe el progreso de scroll (0..1) y
 * la posición del puntero, y dibuja. El componente decide qué hay encima.
 */

export type DayHouseItem =
  | { kind: "image"; src: string }
  | { kind: "text"; text: string };

export type DayHouseOptions = {
  images: [string, string, string, string]; // día, tarde, atardecer, noche
  items: DayHouseItem[]; // 0 = apertura (logo), 1..4 = titular de cada momento
  fontFamily: string;
  mobile: boolean;
  reducedMotion: boolean;
};

export type DayHouseScene = {
  ready: Promise<void>;
  setProgress: (p: number) => void;
  setPointer: (x: number, y: number) => void;
  destroy: () => void;
};

// Tramos del scroll: [inicio, fin] de cada transición entre luces.
// Tramos encadenados, sin pausas: la luz no deja de cambiar mientras se
// baja, como un anochecer real.
const TRANSITIONS: Array<[number, number]> = [
  [0.04, 0.36], // día → tarde
  [0.36, 0.64], // tarde → atardecer
  [0.64, 0.88], // atardecer → noche
];

// Recorrido del sol en coordenadas de la FOTO (x, y desde arriba, 0..1),
// anclado a las cuatro imágenes: alto y centrado de día, a la izquierda
// por la tarde, tocando el horizonte del mar en el punto medido del
// atardecer (11,8 % / 41,4 %) y hundiéndose después.
const SUN_KEYS: Array<[number, number, number]> = [
  [0.0, 0.56, 0.05],
  [0.22, 0.38, 0.16],
  [0.42, 0.22, 0.29],
  [0.6, 0.125, 0.405],
  [0.7, 0.112, 0.43],
  [0.78, 0.105, 0.47],
];
const HORIZON_Y = 0.415; // línea del mar en la foto (desde arriba)

// Encuadre horizontal en móvil: la cámara sigue al sol hasta el mar y
// vuelve a la casa cuando se encienden las luces.
const MOBILE_FOCUS: Array<[number, number]> = [
  [0.0, 0.66],
  [0.25, 0.5],
  [0.5, 0.22],
  [0.64, 0.08],
  [0.76, 0.2],
  [0.9, 0.68],
];

// Ventanas de cada texto: [entra desde, formado en, empieza a irse, se ha ido].
// El primero (logo) entra con el tiempo de la apertura, no con el scroll.
const TEXT_WINDOWS: Array<[number, number, number, number]> = [
  [-1, -1, 0.0, 0.05], // logo
  [0.04, 0.09, 0.15, 0.21], // Se valora.
  [0.27, 0.33, 0.39, 0.45], // Se muestra.
  [0.55, 0.61, 0.67, 0.73], // Se negocia.
  [0.85, 0.91, 2, 2], // Se vende. (se queda)
];

const FOG_COLORS: Array<[number, number, number]> = [
  [0.93, 0.94, 0.95], // día: bruma blanca
  [0.96, 0.87, 0.76], // tarde: miel
  [0.98, 0.75, 0.58], // atardecer: melocotón
  [0.17, 0.22, 0.36], // noche: azul profundo
];

const vertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const fragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uFrom;
uniform sampler2D uTo;
uniform sampler2D uDusk;
uniform sampler2D uNight;
uniform sampler2D uText;
uniform float uT;
uniform float uTime;
uniform float uIntro;
uniform float uTextAmt;
uniform float uTextAspect;
uniform float uTextW;
uniform float uTextY;
uniform float uNightW;
uniform float uScale;
uniform float uOctaves;
uniform vec2 uRes;
uniform vec2 uImg;
uniform vec2 uFocus;
uniform vec2 uPointer;
uniform vec3 uFogFrom;
uniform vec3 uFogTo;
uniform vec2 uSun;
uniform float uSunI;
uniform float uSunLow;
uniform float uHorizon;
uniform vec2 uSunScreen;
uniform float uDay;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 6; i++) {
    if (float(i) >= uOctaves) break;
    v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5;
  }
  return v;
}
float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

vec2 coverUv(vec2 uv) {
  float sa = uRes.x / uRes.y; float ia = uImg.x / uImg.y;
  vec2 s = sa > ia ? vec2(1.0, ia / sa) : vec2(sa / ia, 1.0);
  vec2 off = (1.0 - s) * uFocus;
  return uv * s + off;
}

void main() {
  float sa = uRes.x / uRes.y;
  vec2 uv = coverUv(vUv);
  uv = 0.5 + (uv - 0.5) / uScale + uPointer * 0.006;

  // --- Paso de una luz a la siguiente: un anochecer continuo, sin
  // manchas. Toda la imagen cambia a la vez (el cielo, apenas un poco por
  // delante) y la mezcla se hace en luz lineal, que es como se suma la luz
  // de verdad: así no se percibe un cambio de foto, solo que oscurece.
  float lead = (vUv.y - 0.5) * 0.16 * sin(3.14159 * uT);
  float m = smoothstep(0.0, 1.0, clamp(uT + lead, 0.0, 1.0));
  vec3 a = pow(texture2D(uFrom, uv).rgb, vec3(2.2));
  vec3 b = pow(texture2D(uTo, uv).rgb, vec3(2.2));
  vec3 col = pow(mix(a, b, m), vec3(1.0 / 2.2));
  vec3 fogC = mix(uFogFrom, uFogTo, m);

  // --- Luces de la casa, encendiéndose por zonas
  if (uNightW > 0.001) {
    vec3 nc = texture2D(uNight, uv).rgb;
    vec3 dc = texture2D(uDusk, uv).rgb;
    float lm = smoothstep(0.05, 0.26, lum(nc) - lum(dc) * 0.85) * smoothstep(0.0, 0.08, nc.r - nc.b + 0.05);
    vec2 cell = floor(uv * vec2(9.0, 5.0));
    float h = hash(cell);
    float on = smoothstep(h * 0.75, h * 0.75 + 0.15, uNightW);
    col = mix(col, nc, lm * on * (1.0 - m * 0.0));
    vec3 glow = vec3(0.0);
    for (int k = 0; k < 8; k++) {
      float ang = float(k) * 0.785398;
      vec2 o = vec2(cos(ang), sin(ang)) * vec2(0.012 / sa * 2.0, 0.018);
      vec3 s = texture2D(uNight, uv + o).rgb;
      glow += max(s - 0.62, 0.0);
    }
    col += glow * vec3(1.0, 0.78, 0.5) * 0.22 * on * uNightW;
  }

  // --- Niebla solo en la apertura: la casa aparece entre la bruma al
  // cargar. Durante el día no hay niebla, para que el anochecer sea limpio.
  vec3 smokeC = fogC;
  float smoke = 0.0;
  if (uIntro < 0.999) {
    vec2 wq = uv * vec2(1.2, 1.9);
    vec2 warp = vec2(fbm(wq + vec2(uTime * 0.05, 0.0)), fbm(wq + vec2(5.2, 1.3) - vec2(0.0, uTime * 0.04)));
    float cloud = fbm(wq * 1.3 + warp * 2.2 + vec2(uTime * 0.07, uTime * 0.02));
    float f2 = fbm(uv * 3.4 - vec2(uTime * 0.06, -uTime * 0.03) + warp);
    smoke = smoothstep(0.38, 0.82, cloud * 0.75 + f2 * 0.35);
    smokeC = fogC * (0.78 + 0.42 * smoothstep(0.3, 0.9, f2)) + vec3(0.02);
    float density = (1.0 - smoothstep(0.2, 1.0, uIntro)) * 1.35;
    col = mix(col, smokeC, clamp(smoke * density, 0.0, 0.94));
  }

  // --- El sol: disco, halo, dispersión en el cielo, reflejo en el agua y
  // destellos de cámara. Vive en coordenadas de la foto (uv), así que se
  // mantiene en su sitio del cielo aunque cambie el encuadre.
  if (uSunI > 0.001) {
    float ia = uImg.x / uImg.y;
    vec2 sd = (uv - uSun) * vec2(ia, 1.0);
    float dist = length(sd);
    float above = smoothstep(uHorizon - 0.004, uHorizon + 0.006, uv.y);
    vec3 sunCol = mix(vec3(1.0, 0.97, 0.9), vec3(1.0, 0.58, 0.26), uSunLow);
    float r = mix(0.013, 0.028, uSunLow);
    float disc = smoothstep(r, r * 0.82, dist);
    float halo = exp(-dist * mix(14.0, 6.5, uSunLow)) * mix(0.32, 0.55, uSunLow);
    float sky = exp(-dist * 2.8) * mix(0.08, 0.38, uSunLow);
    float flatH = exp(-abs(uv.y - uHorizon) * 18.0) * exp(-abs(sd.x) * 2.2) * uSunLow * 0.5;
    vec3 add = sunCol * (disc * 1.25 * above + halo * above + sky * (0.4 + 0.6 * above) + flatH);
    // Reflejo: columna de luz que tiembla sobre el mar y la piscina
    if (uv.y < uHorizon) {
      float depth = uHorizon - uv.y;
      float wob = noise(vec2(uv.y * 160.0, uTime * 1.6)) - 0.5;
      float column = exp(-abs(sd.x + wob * 0.02 * (0.5 + depth * 3.0)) * mix(60.0, 22.0, uSunLow));
      float glint = smoothstep(0.55, 1.0, noise(vec2(uv.x * 220.0, uv.y * 900.0 + uTime * 3.0)));
      add += sunCol * column * exp(-depth * mix(14.0, 5.0, uSunLow)) * (0.35 + glint * 0.9) * (0.25 + uSunLow * 0.75);
    }
    col += add * uSunI;
    vec2 axis = vec2(0.5) - uSunScreen;
    vec2 sp = vUv * vec2(sa, 1.0);
    for (int k = 1; k <= 3; k++) {
      float fk = float(k);
      vec2 c = (uSunScreen + axis * (0.5 + fk * 0.45)) * vec2(sa, 1.0);
      float rr = 0.025 + fk * 0.018;
      float ring = smoothstep(rr, rr * 0.6, length(sp - c));
      col += mix(vec3(1.0, 0.8, 0.55), vec3(0.6, 0.8, 1.0), fk / 3.0) * ring * 0.045 * uSunI * (1.0 - uSunLow * 0.3);
    }
  }

  // --- Titular condensándose desde el humo
  vec2 p = vUv - vec2(0.5, uTextY);
  p.x *= sa;
  float w = uTextW * sa;
  vec2 tuv = p / vec2(w, w / uTextAspect) + 0.5;
  float amt = uTextAmt;
  float inv = 1.0 - amt;
  // Desplazamiento suave (baja frecuencia) y deriva hacia arriba: las
  // letras se deshacen como humo que sube, no como una interferencia.
  vec2 d = vec2(fbm(tuv * vec2(1.4, 2.0) + uTime * 0.12), fbm(tuv * vec2(1.4, 2.0) + 7.3 - uTime * 0.1)) - 0.5;
  float rise = fbm(tuv * vec2(2.5, 1.0) + uTime * 0.05);
  tuv += d * inv * 0.22 + vec2(0.0, -inv * inv * (0.25 + rise * 0.35));
  if (amt > 0.001) {
    float r = 0.004 + inv * 0.07;
    float sharp = 0.0; float soft = 0.0; float halo = 0.0;
    if (tuv.x > 0.0 && tuv.x < 1.0 && tuv.y > 0.0 && tuv.y < 1.0) sharp = texture2D(uText, tuv).a;
    for (int k = 0; k < 10; k++) {
      float ang = float(k) * 0.628318 + uTime * 0.2;
      float rr = r * (0.55 + 0.45 * fract(float(k) * 0.37));
      vec2 q = tuv + vec2(cos(ang), sin(ang)) * vec2(rr, rr * uTextAspect * 0.35);
      if (q.x > 0.0 && q.x < 1.0 && q.y > 0.0 && q.y < 1.0) soft += texture2D(uText, q).a;
      vec2 q2 = tuv + vec2(cos(ang), sin(ang)) * vec2(0.05, 0.05 * uTextAspect * 0.35) + d * 0.1;
      if (q2.x > 0.0 && q2.x < 1.0 && q2.y > 0.0 && q2.y < 1.0) halo += texture2D(uText, q2).a;
    }
    soft /= 10.0; halo /= 10.0;
    float tn = fbm(tuv * vec2(3.0, 5.0) + uTime * 0.15);
    float vis = smoothstep(tn - 0.25, tn + 0.05, amt * 1.3 - 0.15);
    float ta = mix(soft, sharp, amt * amt) * vis * (0.35 + 0.65 * amt);
    float puff = halo * (sin(3.14159 * amt) * 0.9 + 0.1) * (0.55 + smoke * 0.7);
    col = mix(col, smokeC * 1.08 + 0.04, clamp(puff, 0.0, 0.8));
    col *= 1.0 - clamp(halo * 0.32 + soft * 0.18, 0.0, 0.4) * amt;
    col = mix(col, vec3(0.985, 0.955, 0.91), clamp(ta * 1.05, 0.0, 0.97));
  }

  // --- Apertura desde negro, viñeta, lectura del texto inferior y grano
  col *= smoothstep(0.0, 0.3, uIntro);
  float vig = smoothstep(1.25, 0.35, length((vUv - 0.5) * vec2(sa * 0.55, 1.0)));
  col *= mix(mix(0.72, 0.9, uDay), 1.0, vig);
  col *= mix(mix(0.62, 0.94, uDay), 1.0, smoothstep(0.0, 0.42, vUv.y));
  col += (hash(vUv * uRes + fract(uTime) * 17.0) - 0.5) * 0.035;
  gl_FragColor = vec4(col, 1.0);
}
`;

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function smooth(t: number) {
  return t * t * (3 - 2 * t);
}

function interp<T extends number[]>(keys: T[], p: number): number[] {
  if (p <= keys[0][0]) return keys[0].slice(1);
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (p <= b[0]) {
      const t = smooth((p - a[0]) / (b[0] - a[0]));
      return a.slice(1).map((v, k) => v + (b[k + 1] - v) * t);
    }
  }
  return keys[keys.length - 1].slice(1);
}

function lightState(p: number): { from: number; to: number; t: number } {
  for (let i = 0; i < TRANSITIONS.length; i++) {
    const [s, e] = TRANSITIONS[i];
    if (p < s) return { from: i, to: i, t: 0 };
    if (p <= e) return { from: i, to: i + 1, t: easeInOut((p - s) / (e - s)) };
  }
  return { from: 3, to: 3, t: 0 };
}

export function textState(p: number, intro: number): { index: number; amt: number } {
  for (let i = 0; i < TEXT_WINDOWS.length; i++) {
    const [a, b, c, d] = TEXT_WINDOWS[i];
    if (i === 0) {
      if (p < d) {
        const formed = clamp01((intro - 0.35) / 0.5);
        const leaving = 1 - clamp01((p - c) / (d - c));
        return { index: 0, amt: Math.min(formed, leaving) };
      }
      continue;
    }
    if (p >= a && p < d) {
      const inAmt = clamp01((p - a) / (b - a));
      const outAmt = 1 - clamp01((p - c) / (d - c));
      return { index: i, amt: Math.min(inAmt, outAmt) };
    }
  }
  return { index: -1, amt: 0 };
}

function makeTextTexture(text: string, fontFamily: string): { tex: THREE.Texture; aspect: number } {
  const canvas = document.createElement("canvas");
  const W = 2048;
  const H = 420;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let size = 300;
  ctx.font = `italic 400 ${size}px ${fontFamily}`;
  const maxW = W * 0.92;
  const measured = ctx.measureText(text).width;
  if (measured > maxW) {
    size = Math.floor((size * maxW) / measured);
    ctx.font = `italic 400 ${size}px ${fontFamily}`;
  }
  ctx.fillText(text, W / 2, H / 2 + size * 0.04);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return { tex, aspect: W / H };
}

export function createDayHouseScene(canvas: HTMLCanvasElement, opts: DayHouseOptions): DayHouseScene {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.mobile ? 1.5 : 1.75));

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const empty = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
  empty.needsUpdate = true;

  const uniforms = {
    uFrom: { value: empty as THREE.Texture },
    uTo: { value: empty as THREE.Texture },
    uDusk: { value: empty as THREE.Texture },
    uNight: { value: empty as THREE.Texture },
    uText: { value: empty as THREE.Texture },
    uT: { value: 0 },
    uTime: { value: 0 },
    uIntro: { value: 0 },
    uTextAmt: { value: 0 },
    uTextAspect: { value: 4 },
    uTextW: { value: opts.mobile ? 0.86 : 0.56 },
    uTextY: { value: opts.mobile ? 0.6 : 0.6 },
    uNightW: { value: 0 },
    uScale: { value: 1.08 },
    uOctaves: { value: opts.mobile ? 4 : 5 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uImg: { value: new THREE.Vector2(1536, 768) },
    uFocus: { value: new THREE.Vector2(opts.mobile ? 0.7 : 0.5, 0.5) },
    uPointer: { value: new THREE.Vector2(0, 0) },
    uFogFrom: { value: new THREE.Vector3(...FOG_COLORS[0]) },
    uFogTo: { value: new THREE.Vector3(...FOG_COLORS[0]) },
    uSun: { value: new THREE.Vector2(0.5, 0.9) },
    uSunI: { value: 1 },
    uSunLow: { value: 0 },
    uHorizon: { value: 1 - HORIZON_Y },
    uSunScreen: { value: new THREE.Vector2(0.5, 0.9) },
    uDay: { value: 1 },
  };

  const material = new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, uniforms });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  scene.add(mesh);

  let target = 0;
  let shown = 0;
  let px = 0;
  let py = 0;
  let tx = 0;
  let ty = 0;
  let started = 0;
  let raf = 0;
  let visible = true;
  let destroyed = false;

  const loader = new THREE.TextureLoader();
  const images: THREE.Texture[] = [];
  const texts: Array<{ tex: THREE.Texture; aspect: number; width: number }> = [];

  function prepare(t: THREE.Texture) {
    t.colorSpace = THREE.NoColorSpace;
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = false;
    t.wrapS = THREE.ClampToEdgeWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  }

  const ready = (async () => {
    const loaded = await Promise.all(opts.images.map((src) => loader.loadAsync(src)));
    loaded.forEach((t) => images.push(prepare(t)));
    const img = loaded[0].image as HTMLImageElement;
    uniforms.uImg.value.set(img.naturalWidth || img.width, img.naturalHeight || img.height);
    uniforms.uDusk.value = images[2];
    uniforms.uNight.value = images[3];
    try {
      await document.fonts.load(`italic 400 80px ${opts.fontFamily}`);
    } catch {
      /* si la fuente no carga, se usa la de reserva */
    }
    for (const item of opts.items) {
      if (item.kind === "image") {
        const t = prepare(await loader.loadAsync(item.src));
        const im = t.image as HTMLImageElement;
        texts.push({ tex: t, aspect: (im.naturalWidth || im.width) / (im.naturalHeight || im.height), width: opts.mobile ? 0.72 : 0.42 });
      } else {
        const { tex, aspect } = makeTextTexture(item.text, opts.fontFamily);
        texts.push({ tex, aspect, width: opts.mobile ? 0.92 : 0.6 });
      }
    }
    started = performance.now();
  })();


  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    uniforms.uRes.value.set(w, h);
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  const io = new IntersectionObserver((entries) => {
    visible = entries[0]?.isIntersecting ?? true;
  });
  io.observe(canvas);

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    if (!visible || images.length < 4) return;
    const time = opts.reducedMotion ? 4 : now / 1000;
    const intro = started ? clamp01((now - started) / (opts.reducedMotion ? 1 : 3200)) : 0;
    shown += (target - shown) * 0.14;
    px += (tx - px) * 0.05;
    py += (ty - py) * 0.05;

    const ls = lightState(shown);
    uniforms.uFrom.value = images[ls.from];
    uniforms.uTo.value = images[ls.to];
    uniforms.uT.value = ls.t;
    uniforms.uFogFrom.value.set(...FOG_COLORS[ls.from]);
    uniforms.uFogTo.value.set(...FOG_COLORS[ls.to]);
    uniforms.uNightW.value = ls.to === 3 ? (ls.from === 3 ? 1 : ls.t) : 0;
    uniforms.uScale.value = 1.08 - shown * 0.06;
    // De día no se oscurece la base de la imagen: el texto es oscuro.
    uniforms.uDay.value = 1 - smooth(clamp01((shown - 0.66) / 0.14));

    // Encuadre (en móvil sigue al sol) y posición del sol en pantalla.
    const focusX = opts.mobile ? interp(MOBILE_FOCUS, shown)[0] : 0.5 - Math.sin(Math.PI * clamp01((shown - 0.3) / 0.45)) * 0.06;
    uniforms.uFocus.value.set(focusX, 0.5);
    const [sx, sy] = interp(SUN_KEYS, shown);
    uniforms.uSun.value.set(sx, 1 - sy);
    uniforms.uSunLow.value = clamp01((sy - 0.06) / (HORIZON_Y - 0.06));
    uniforms.uSunI.value = 1 - smooth(clamp01((shown - 0.64) / 0.12));
    const res = uniforms.uRes.value;
    const img = uniforms.uImg.value;
    const sa = res.x / res.y;
    const ia = img.x / img.y;
    const scx = sa > ia ? 1 : sa / ia;
    const scy = sa > ia ? ia / sa : 1;
    const ux = (sx - 0.5 - px * 0.006) * uniforms.uScale.value + 0.5;
    const uy = (1 - sy - 0.5 - py * 0.006) * uniforms.uScale.value + 0.5;
    uniforms.uSunScreen.value.set((ux - (1 - scx) * focusX) / scx, (uy - (1 - scy) * 0.5) / scy);
    uniforms.uIntro.value = intro;
    uniforms.uTime.value = time;
    uniforms.uPointer.value.set(px, py);

    const ts = textState(shown, intro);
    if (ts.index >= 0 && texts[ts.index]) {
      const t = texts[ts.index];
      uniforms.uText.value = t.tex;
      uniforms.uTextAspect.value = t.aspect;
      uniforms.uTextW.value = t.width;
      uniforms.uTextAmt.value = opts.reducedMotion ? (ts.amt > 0.5 ? 1 : 0) : ts.amt;
    } else {
      uniforms.uTextAmt.value = 0;
    }
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);

  return {
    ready,
    setProgress(p: number) {
      target = clamp01(p);
    },
    setPointer(x: number, y: number) {
      tx = x;
      ty = y;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      images.forEach((t) => t.dispose());
      texts.forEach((t) => t.tex.dispose());
      material.dispose();
      mesh.geometry.dispose();
      renderer.dispose();
    },
  };
}

export const DAY_HOUSE_TIMING = { TRANSITIONS, TEXT_WINDOWS };
