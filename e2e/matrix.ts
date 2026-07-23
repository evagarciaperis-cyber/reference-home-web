// Matriz compartida entre el capturador del oráculo (capture-oracle.ts) y el
// test de paridad (parity.spec.ts). Un solo lugar para no desincronizar ambos.

export type Viewport = {
  name: string;
  width: number;
  height: number;
  reducedMotion?: boolean;
};

// Anchos acordados en docs/ARQUITECTURA.md (sección 0/1): 375/768/1024/1440/1920.
export const VIEWPORTS: Viewport[] = [
  { name: "mobile-375", width: 375, height: 812 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "laptop-1024", width: 1024, height: 800 },
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "wide-1920", width: 1920, height: 1080 },
];

// Muestra representativa con "reducir movimiento" activado (experiencia estática).
export const REDUCED_MOTION_VIEWPORTS: Viewport[] = [
  { name: "mobile-375-reduced", width: 375, height: 812, reducedMotion: true },
  { name: "desktop-1440-reduced", width: 1440, height: 900, reducedMotion: true },
];

export const ALL_VIEWPORTS: Viewport[] = [...VIEWPORTS, ...REDUCED_MOTION_VIEWPORTS];

export type Route = {
  name: string;
  /** Ruta del fichero relativa a la raíz de web-nueva/ (oráculo). */
  oracleFile: string;
  /** Ruta en el proyecto nuevo (Next.js). */
  currentPath: string;
};

// Se amplía a medida que avanza la migración (ver docs/MIGRACION.md).
export const ROUTES: Route[] = [{ name: "home", oracleFile: "index.html", currentPath: "/" }];

// Porcentaje máximo de píxeles distintos tolerado. Estricto a propósito:
// el requisito es paridad absoluta, no "parecido".
export const PARITY_THRESHOLD = 0.001;
