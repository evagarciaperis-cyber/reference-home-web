// Renderer WebGL puro (sin librería) para el fondo ambiental de Manifesto
// (2026-07-28, décima corrección -- se abandona la "gota" y cualquier
// noción de silueta: ahora son dos ondas anchas, difuminadas y sin
// contorno reconocible, pensadas como profundidad atmosférica, no como
// una forma). Un único plano (triángulo a pantalla completa), un único
// material/programa, un único draw call.
//
// 2026-08-05 (fix infraestructura WebGL compartida): este archivo era el
// ÚNICO punto de todo el proyecto que llamaba a
// `WEBGL_lose_context.loseContext()` en su limpieza (dispose) -- ver
// useThreeScene.ts línea ~71: "Sin forceContextLoss() -- no está
// justificado en un desmontaje normal", una decisión ya tomada
// deliberadamente ahí y que aquí no se seguía. La diferencia importa
// porque el <canvas> de este módulo es JSX de React (Manifesto.tsx,
// canvasRef), así que el MISMO nodo DOM persiste entre el doble montaje
// de React Strict Mode en desarrollo (monta -> limpia -> vuelve a
// montar, sin recrear el <canvas>) -- mientras que cada escena Three.js
// crea un <canvas> nuevo en cada montaje (useThreeScene.ts,
// document.createElement interno de THREE.WebGLRenderer) y por eso
// perder su contexto al desmontar nunca importó ahí.
//
// La secuencia real del bug: 1er montaje -> gl = canvas.getContext('webgl')
// (contexto A, válido) -> Strict Mode limpia inmediatamente -> dispose()
// llamaba a loseContext(), matando el contexto A para siempre -> 2º
// montaje (mismo <canvas>) -> canvas.getContext('webgl') NO crea un
// contexto nuevo: la especificación dice que un <canvas> solo puede tener
// un contexto de un tipo dado en toda su vida, así que devuelve ESE MISMO
// contexto A, ya perdido -> gl.isContextLost() es true -> compileShader
// falla y gl.getShaderInfoLog() devuelve null (comportamiento de spec en
// un contexto perdido, no un error de sintaxis GLSL) -> compileShader
// lanzaba una excepción síncrona dentro del efecto de useAmbientLiquid.ts
// -> React no tiene forma de recuperarse de un throw en un efecto pasivo
// sin un error boundary: aborta y vuelve a montar el árbol completo, y en
// esa reconstrucción abrupta es donde aparecía el "removeChild" en otro
// nodo -- síntoma secundario del mismo fallo, no un bug independiente.
//
// El arreglo real es simplemente NO forzar la pérdida del contexto al
// desmontar (igual que useThreeScene.ts ya hacía) -- basta con liberar los
// recursos (shaders/programa/buffer) sin matar el contexto. El resto de
// cambios de esta ronda (diagnóstico rico, no relanzar excepciones,
// idempotencia, listeners de contextlost/restored, fallback
// experimental-webgl) son refuerzos de robustez sobre esa causa raíz, no
// el fix en sí.

const VERTEX_SRC = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

// Cada onda es un único campo elíptico con caída GAUSSIANA (no
// smoothstep con borde grande, no metaballs): un campo gaussiano no tiene
// meseta interior ni límite claro en ningún punto -- se desvanece de
// forma continua desde el centro, que es exactamente "sin centro duro,
// sin contorno reconocible" sin necesidad de un blur real por
// convolución (caro, e innecesario aquí).
const FRAGMENT_SRC = `
precision mediump float;

uniform float u_time;

uniform vec2 u_warmCenter;
uniform vec2 u_warmHalfSize;
uniform float u_warmRotation;
uniform float u_warmOpacity;
uniform vec3 u_warmColor;

uniform vec2 u_tealCenter;
uniform vec2 u_tealHalfSize;
uniform float u_tealRotation;
uniform float u_tealOpacity;
uniform vec3 u_tealColor;

// Deriva orgánica de muy baja amplitud -- solo para que el óvalo no lea
// como una elipse matemática perfecta; no es la fuente del movimiento
// (eso lo decide el hook), es una micro-perturbación fija del propio
// campo.
vec2 warp(vec2 p, float phase) {
  float wx = sin(p.y * 0.005 + u_time * 0.05 + phase) * 4.0;
  float wy = cos(p.x * 0.005 - u_time * 0.045 + phase) * 4.0;
  return p + vec2(wx, wy);
}

float gaussianField(vec2 p, vec2 center, vec2 halfSize, float rotation, float phase) {
  vec2 warped = warp(p, phase);
  vec2 d = warped - center;
  float c = cos(rotation);
  float s = sin(rotation);
  vec2 rotated = vec2(d.x * c - d.y * s, d.x * s + d.y * c);
  vec2 norm = rotated / halfSize;
  float dist2 = dot(norm, norm);
  return exp(-dist2);
}

void main() {
  vec2 p = gl_FragCoord.xy;

  float aWarm = gaussianField(p, u_warmCenter, u_warmHalfSize, u_warmRotation, 0.0) * u_warmOpacity;
  float aTeal = gaussianField(p, u_tealCenter, u_tealHalfSize, u_tealRotation, 2.1) * u_tealOpacity;

  float alphaOut = clamp(aWarm + aTeal * (1.0 - aWarm), 0.0, 1.0);
  vec3 premult = u_warmColor * aWarm * (1.0 - aTeal) + u_tealColor * aTeal;
  vec3 colorOut = alphaOut > 0.0008 ? premult / alphaOut : vec3(0.0);

  gl_FragColor = vec4(colorOut, alphaOut);
}
`;

// Diagnóstico de contexto -- versión/renderer real de la GPU (si el
// navegador expone la extensión; algunos la bloquean por fingerprinting,
// no es un fallo) y si el contexto ya está perdido en el momento de
// preguntar. Se usa en todos los logs de error de este módulo para que un
// fallo de shader nunca aparezca como un misterio sin contexto.
function describeContext(gl: WebGLRenderingContext): string {
  let renderer = "no disponible (extensión bloqueada o navegador sin soporte)";
  try {
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    if (dbg) renderer = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL));
  } catch {
    // Ver comentario de arriba -- no es un error real, solo diagnóstico mejor-esfuerzo.
  }
  return (
    `webgl.version=${gl.getParameter(gl.VERSION)} ` +
    `glsl=${gl.getParameter(gl.SHADING_LANGUAGE_VERSION)} ` +
    `renderer=${renderer} ` +
    `contextLost=${gl.isContextLost()}`
  );
}

// Nunca lanza -- devuelve null y deja un diagnóstico completo en consola
// si la compilación falla, para que la llamante (createLiquidRenderer)
// pueda degradar sin romper el ciclo de efectos de React. Distingue
// explícitamente vertex/fragment y, si el contexto está perdido, lo dice
// -- getShaderInfoLog() devuelve null precisamente en ese estado (spec),
// así que un infoLog null NUNCA debe leerse como "no hay información",
// sino como "revisa contextLost primero".
function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const kind = type === gl.VERTEX_SHADER ? "VERTEX" : "FRAGMENT";

  if (gl.isContextLost()) {
    console.error(`[liquidBackground] Contexto WebGL ya perdido antes de compilar el shader ${kind} -- se aborta sin intentarlo.`);
    return null;
  }

  const shader = gl.createShader(type);
  if (!shader) {
    console.error(`[liquidBackground] gl.createShader(${kind}) devolvió null. ${describeContext(gl)}`);
    return null;
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  const ok = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (!ok) {
    // Todo se lee ANTES de borrar el shader -- tras deleteShader() ya no
    // hay garantía de poder consultar su fuente/log.
    const info = gl.getShaderInfoLog(shader);
    const shaderSource = gl.getShaderSource(shader);
    const glError = gl.getError();
    const contextLost = gl.isContextLost();
    gl.deleteShader(shader);

    if (info === null && contextLost) {
      console.error(
        `[liquidBackground] Shader ${kind}: no compiló porque el contexto WebGL se perdió justo durante la compilación ` +
          `(getShaderInfoLog() devuelve null en ese estado -- no es un error de sintaxis GLSL). ` +
          `gl.getError()=${glError}. ${describeContext(gl)}`,
      );
    } else {
      console.error(
        `[liquidBackground] Shader ${kind} no compiló.\n` +
          `infoLog: ${info ?? "(sin infoLog -- ver contextLost arriba)"}\n` +
          `gl.getError()=${glError}\n` +
          `${describeContext(gl)}\n` +
          `--- fuente ---\n${shaderSource ?? source}`,
      );
    }
    return null;
  }

  return shader;
}

export type WaveUniforms = {
  center: [number, number]; // px de canvas, origen abajo-izquierda
  halfSize: [number, number]; // px de canvas
  rotation: number; // radianes
  opacity: number;
  color: [number, number, number]; // 0..1
};

export type LiquidUniforms = {
  time: number;
  warm: WaveUniforms;
  teal: WaveUniforms;
};

export type LiquidRenderer = {
  render: (uniforms: LiquidUniforms) => void;
  resize: (width: number, height: number, dpr: number) => void;
  dispose: () => void;
};

// Nunca lanza: cualquier fallo (WebGL no disponible, contexto perdido,
// shader que no compila, programa que no enlaza) se registra en consola
// con diagnóstico completo y la función devuelve null -- useAmbientLiquid.ts
// ya trata null como "sin fondo líquido, el resto de Manifesto sigue
// funcionando con normalidad".
export function createLiquidRenderer(canvas: HTMLCanvasElement): LiquidRenderer | null {
  const contextAttrs: WebGLContextAttributes = { alpha: true, premultipliedAlpha: false, antialias: true };

  let gl: WebGLRenderingContext | null = null;
  try {
    // Solo WebGL1: los shaders de arriba usan sintaxis GLSL ES 1.00
    // (attribute/varying, gl_FragColor) -- pedir "webgl2" aquí exigiría
    // reescribirlos (#version 300 es, in/out, sampler/out propio) sin
    // ninguna ganancia real para dos campos gaussianos y un draw call.
    // "experimental-webgl" es el nombre que exponían navegadores antiguos
    // (Safari <11 y similares) para el mismo contexto -- sin este
    // fallback, canvas.getContext("webgl") podía devolver null ahí aunque
    // el hardware soportara WebGL1 perfectamente.
    gl =
      (canvas.getContext("webgl", contextAttrs) as WebGLRenderingContext | null) ??
      (canvas.getContext("experimental-webgl", contextAttrs) as WebGLRenderingContext | null);
  } catch (error) {
    console.error("[liquidBackground] canvas.getContext() lanzó una excepción al crear el contexto WebGL.", error);
    return null;
  }

  if (!gl) {
    console.warn("[liquidBackground] WebGL no disponible en este navegador/dispositivo -- fondo líquido desactivado.");
    return null;
  }
  if (gl.isContextLost()) {
    // Puede pasar si este MISMO <canvas> ya tuvo antes un contexto que se
    // perdió (ver nota de cabecera del archivo) -- un <canvas> solo puede
    // tener un contexto de un tipo en toda su vida, así que getContext()
    // devuelve ese mismo contexto perdido en vez de uno nuevo. Seguir
    // dependiendo de que dispose() nunca fuerce la pérdida (más abajo) es
    // lo que evita llegar aquí en el caso normal de Strict Mode/Fast
    // Refresh; este chequeo es la red de seguridad para cualquier otra
    // causa de pérdida (GPU reset, límite de contextos del navegador...).
    console.warn("[liquidBackground] El contexto WebGL obtenido ya está perdido -- fondo líquido desactivado.");
    return null;
  }

  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SRC);
  if (!vertexShader) return null;

  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SRC);
  if (!fragmentShader) {
    gl.deleteShader(vertexShader);
    return null;
  }

  const program = gl.createProgram();
  if (!program) {
    console.error(`[liquidBackground] gl.createProgram() devolvió null. ${describeContext(gl)}`);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    return null;
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    console.error(
      `[liquidBackground] Error al enlazar el programa WebGL.\n` +
        `infoLog: ${info ?? "(sin infoLog -- revisar contextLost)"}\n` +
        `gl.getError()=${gl.getError()}\n${describeContext(gl)}`,
    );
    gl.deleteProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    return null;
  }

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const positionLoc = gl.getAttribLocation(program, "a_position");

  const uniformLoc = (name: string) => gl.getUniformLocation(program, name);
  const locs = {
    time: uniformLoc("u_time"),
    warmCenter: uniformLoc("u_warmCenter"),
    warmHalfSize: uniformLoc("u_warmHalfSize"),
    warmRotation: uniformLoc("u_warmRotation"),
    warmOpacity: uniformLoc("u_warmOpacity"),
    warmColor: uniformLoc("u_warmColor"),
    tealCenter: uniformLoc("u_tealCenter"),
    tealHalfSize: uniformLoc("u_tealHalfSize"),
    tealRotation: uniformLoc("u_tealRotation"),
    tealOpacity: uniformLoc("u_tealOpacity"),
    tealColor: uniformLoc("u_tealColor"),
  };

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  let width = canvas.width;
  let height = canvas.height;

  // true si el contexto se perdió DESPUÉS de crear este renderer (evento
  // webglcontextlost) -- resize/render se vuelven no-op mientras tanto,
  // igual que useThreeScene.ts hace vía su propio `supported`. Sin
  // restauración completa (recompilar/recrear buffers): mismo criterio de
  // restraint que useThreeScene.ts, basta con dejar de dibujar sobre un
  // contexto muerto.
  let contextLost = false;
  let disposed = false;

  const handleContextLost = (event: Event) => {
    // preventDefault() es lo que permite que el navegador dispare
    // webglcontextrestored más adelante -- sin esto, algunos navegadores
    // dan el contexto por perdido para siempre.
    event.preventDefault();
    contextLost = true;
  };
  const handleContextRestored = () => {
    contextLost = false;
  };
  canvas.addEventListener("webglcontextlost", handleContextLost, false);
  canvas.addEventListener("webglcontextrestored", handleContextRestored, false);

  const resize = (w: number, h: number, dpr: number) => {
    if (disposed || contextLost || gl.isContextLost()) return;
    width = Math.max(1, Math.round(w * dpr));
    height = Math.max(1, Math.round(h * dpr));
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
  };

  const setWave = (prefix: "warm" | "teal", w: WaveUniforms) => {
    const l = prefix === "warm"
      ? { center: locs.warmCenter, halfSize: locs.warmHalfSize, rotation: locs.warmRotation, opacity: locs.warmOpacity, color: locs.warmColor }
      : { center: locs.tealCenter, halfSize: locs.tealHalfSize, rotation: locs.tealRotation, opacity: locs.tealOpacity, color: locs.tealColor };
    gl.uniform2f(l.center, w.center[0], w.center[1]);
    gl.uniform2f(l.halfSize, w.halfSize[0], w.halfSize[1]);
    gl.uniform1f(l.rotation, w.rotation);
    gl.uniform1f(l.opacity, w.opacity);
    gl.uniform3f(l.color, w.color[0], w.color[1], w.color[2]);
  };

  const render = (u: LiquidUniforms) => {
    if (disposed || contextLost || gl.isContextLost()) return;

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    gl.uniform1f(locs.time, u.time);
    setWave("warm", u.warm);
    setWave("teal", u.teal);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  // Idempotente -- llamarlo dos veces (p.ej. si algún consumidor futuro
  // desmonta y limpia dos veces por error) no debe lanzar ni repetir
  // trabajo. Deliberadamente NO llama a WEBGL_lose_context.loseContext():
  // ver la nota de cabecera del archivo -- este <canvas> es JSX de React
  // y puede volver a montarse sobre el MISMO nodo (Strict Mode, Fast
  // Refresh); forzar la pérdida del contexto aquí es exactamente lo que
  // rompía ese remontaje. Liberar shaders/programa/buffer basta como
  // higiene de memoria sin ese riesgo -- mismo criterio que
  // useThreeScene.ts ya aplica para sus propios recursos Three.js.
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    canvas.removeEventListener("webglcontextlost", handleContextLost);
    canvas.removeEventListener("webglcontextrestored", handleContextRestored);
    if (!gl.isContextLost()) {
      gl.deleteBuffer(positionBuffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    }
  };

  return { render, resize, dispose };
}
