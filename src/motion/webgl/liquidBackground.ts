// Renderer WebGL puro (sin librería -- ver nota de elección técnica en
// useAmbientLiquid.ts) para el fondo líquido de Manifesto (2026-07-27,
// octava corrección). Un único plano (triángulo a pantalla completa), un
// único material/programa, un único draw call. No sabe nada de React ni
// de frameTicker -- expone `render(uniforms)` para que el hook llame
// exactamente cuando el ticker compartido lo indique.

export const WARM_POINT_COUNT = 5;
export const TEAL_POINT_COUNT = 4;

const VERTEX_SRC = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

// Metaballs vía suma de "esferas suaves" (smoothstep individual por punto,
// sumadas y vueltas a umbralizar) en vez de un campo 1/d^2 clásico: es
// mucho más fácil de calibrar en píxeles reales (radio y ancho de borde
// directamente en px de pantalla) que un campo inverso-cuadrático, y da
// el mismo tipo de fusión orgánica entre puntos cercanos/solapados.
const FRAGMENT_SRC = `
precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;

uniform vec2 u_warmPoints[${WARM_POINT_COUNT}];
uniform float u_warmRadii[${WARM_POINT_COUNT}];
uniform vec2 u_warmStretchDir;
uniform float u_warmStretchAmt;
uniform float u_warmSquashAmt;
uniform vec3 u_warmColor;

uniform vec2 u_tealPoints[${TEAL_POINT_COUNT}];
uniform float u_tealRadii[${TEAL_POINT_COUNT}];
uniform vec2 u_tealStretchDir;
uniform float u_tealStretchAmt;
uniform float u_tealSquashAmt;
uniform vec3 u_tealColor;

uniform float u_edgePx;

// Domain warping muy suave (perturbación sinusoidal combinada, frecuencia
// baja, amplitud pequeña, evolución temporal lenta) -- solo para romper
// la perfección geométrica del contorno, nunca para generar textura
// visible.
vec2 warp(vec2 p) {
  float wx = sin(p.y * 0.0065 + u_time * 0.12) * 7.0 + sin(p.y * 0.017 - u_time * 0.07) * 3.0;
  float wy = cos(p.x * 0.0065 - u_time * 0.1) * 7.0 + cos(p.x * 0.015 + u_time * 0.09) * 3.0;
  return p + vec2(wx, wy);
}

float anisoDist(vec2 p, vec2 center, vec2 stretchDir, float stretchAmt, float squashAmt) {
  vec2 d = p - center;
  vec2 perp = vec2(-stretchDir.y, stretchDir.x);
  float along = dot(d, stretchDir) / (1.0 + stretchAmt);
  float across = dot(d, perp) / (1.0 - squashAmt);
  return length(vec2(along, across));
}

float ball(float dist, float radius, float edge) {
  return smoothstep(radius + edge, radius - edge, dist);
}

void main() {
  vec2 p = warp(gl_FragCoord.xy);

  float warmField = 0.0;
  for (int i = 0; i < ${WARM_POINT_COUNT}; i++) {
    float d = anisoDist(p, u_warmPoints[i], u_warmStretchDir, u_warmStretchAmt, u_warmSquashAmt);
    warmField += ball(d, u_warmRadii[i], u_edgePx);
  }

  float tealField = 0.0;
  for (int i = 0; i < ${TEAL_POINT_COUNT}; i++) {
    float d = anisoDist(p, u_tealPoints[i], u_tealStretchDir, u_tealStretchAmt, u_tealSquashAmt);
    tealField += ball(d, u_tealRadii[i], u_edgePx);
  }

  // Variación de densidad interior muy sutil (nunca degradado tecnológico):
  // una segunda muestra del propio warp, de baja amplitud, module el alfa.
  float density = 0.94 + 0.06 * sin((p.x + p.y) * 0.01 + u_time * 0.05);

  float warmAlpha = clamp(warmField, 0.0, 1.0) * density;
  float tealAlpha = clamp(tealField, 0.0, 1.0) * density;

  float totalAlpha = clamp(warmAlpha + tealAlpha, 0.0, 1.0);
  vec3 color = totalAlpha > 0.001
    ? (u_warmColor * warmAlpha + u_tealColor * tealAlpha) / max(warmAlpha + tealAlpha, 0.001)
    : vec3(0.0);

  gl_FragColor = vec4(color, totalAlpha);
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

export type ColorGroupUniforms = {
  points: Float32Array; // pares [x,y] en px de canvas (origen abajo-izquierda, ya convertido)
  radii: Float32Array;
  stretchDir: [number, number];
  stretchAmt: number;
  squashAmt: number;
  color: [number, number, number]; // 0..1
};

export type LiquidUniforms = {
  time: number;
  warm: ColorGroupUniforms;
  teal: ColorGroupUniforms;
  edgePx: number;
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
  // Un único triángulo a pantalla completa (más barato que un quad de 2
  // triángulos/4 vértices -- técnica estándar para post-procesado de
  // pantalla completa, un único draw call, sin índices).
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const positionLoc = gl.getAttribLocation(program, "a_position");

  const uniformLoc = (name: string) => gl.getUniformLocation(program, name);
  const locs = {
    resolution: uniformLoc("u_resolution"),
    time: uniformLoc("u_time"),
    warmPoints: uniformLoc("u_warmPoints"),
    warmRadii: uniformLoc("u_warmRadii"),
    warmStretchDir: uniformLoc("u_warmStretchDir"),
    warmStretchAmt: uniformLoc("u_warmStretchAmt"),
    warmSquashAmt: uniformLoc("u_warmSquashAmt"),
    warmColor: uniformLoc("u_warmColor"),
    tealPoints: uniformLoc("u_tealPoints"),
    tealRadii: uniformLoc("u_tealRadii"),
    tealStretchDir: uniformLoc("u_tealStretchDir"),
    tealStretchAmt: uniformLoc("u_tealStretchAmt"),
    tealSquashAmt: uniformLoc("u_tealSquashAmt"),
    tealColor: uniformLoc("u_tealColor"),
    edgePx: uniformLoc("u_edgePx"),
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

  const render = (u: LiquidUniforms) => {
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(locs.resolution, width, height);
    gl.uniform1f(locs.time, u.time);
    gl.uniform1f(locs.edgePx, u.edgePx);

    gl.uniform2fv(locs.warmPoints, u.warm.points);
    gl.uniform1fv(locs.warmRadii, u.warm.radii);
    gl.uniform2f(locs.warmStretchDir, u.warm.stretchDir[0], u.warm.stretchDir[1]);
    gl.uniform1f(locs.warmStretchAmt, u.warm.stretchAmt);
    gl.uniform1f(locs.warmSquashAmt, u.warm.squashAmt);
    gl.uniform3f(locs.warmColor, u.warm.color[0], u.warm.color[1], u.warm.color[2]);

    gl.uniform2fv(locs.tealPoints, u.teal.points);
    gl.uniform1fv(locs.tealRadii, u.teal.radii);
    gl.uniform2f(locs.tealStretchDir, u.teal.stretchDir[0], u.teal.stretchDir[1]);
    gl.uniform1f(locs.tealStretchAmt, u.teal.stretchAmt);
    gl.uniform1f(locs.tealSquashAmt, u.teal.squashAmt);
    gl.uniform3f(locs.tealColor, u.teal.color[0], u.teal.color[1], u.teal.color[2]);

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
