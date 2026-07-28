// Renderer WebGL puro (sin librería) para el fondo ambiental de Manifesto
// (2026-07-28, décima corrección -- se abandona la "gota" y cualquier
// noción de silueta: ahora son dos ondas anchas, difuminadas y sin
// contorno reconocible, pensadas como profundidad atmosférica, no como
// una forma). Un único plano (triángulo a pantalla completa), un único
// material/programa, un único draw call.

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

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("No se pudo crear el shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Error al compilar shader: ${info}`);
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

export function createLiquidRenderer(canvas: HTMLCanvasElement): LiquidRenderer | null {
  const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false, antialias: true });
  if (!gl) return null;

  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SRC);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SRC);
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    throw new Error(`Error al enlazar el programa WebGL: ${info}`);
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

  const resize = (w: number, h: number, dpr: number) => {
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

  const dispose = () => {
    gl.deleteBuffer(positionBuffer);
    gl.deleteProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    const loseContext = gl.getExtension("WEBGL_lose_context");
    loseContext?.loseContext();
  };

  return { render, resize, dispose };
}
