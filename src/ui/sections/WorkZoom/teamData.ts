// Datos del equipo -- usados por WorkZoom.tsx (el bloque en sí) y por
// useTeamFanEntrance.ts (necesita FAN_LAYOUT para animar cada tarjeta a
// su rotación/posición final) -- una sola fuente, nunca datos
// duplicados a mano en dos sitios.
//
// 2026-08-21: retratos reales ya disponibles en
// public/images/team/*.png (PNG, no JPG -- las rutas de abajo son las
// definitivas). Clara Vázquez (/images/team/clara-vazquez.png) EXISTE
// como archivo pero NO se usa todavía -- el bloque aprobado tiene
// exactamente 6 personas, Clara no está en esa lista. La foto de grupo
// (/images/team/equipo-reference-home.png) tampoco se usa -- se
// descartó como pieza principal en esta ronda.
export type TeamMember = {
  name: string;
  role: string;
  quote: string;
  image: string;
};

// Orden de plantilla/roster -- NO es el orden visual del abanico (ver
// FAN_LAYOUT/FAN_ORDER más abajo) ni el de navegación en móvil (ver
// MOBILE_ORDER). El número "01-06" que muestra la banda de información
// activa (WorkZoom.tsx) es la posición de cada persona AQUÍ, en este
// array -- se mantiene estable independientemente de dónde se sitúe
// cada una en el abanico.
export const TEAM_MEMBERS: TeamMember[] = [
  {
    name: "Jordi Osca",
    role: "Gerente",
    quote: "Estar presente cuando más se necesita también forma parte de hacer bien nuestro trabajo.",
    image: "/images/team/jordi-osca.png",
  },
  {
    name: "Eva García",
    role: "Directora comercial",
    quote: "Escuchar de verdad es el primer paso para acompañar bien cada decisión.",
    image: "/images/team/eva-garcia.png",
  },
  {
    name: "Ángeles Albelda",
    role: "Coordinación",
    quote: "Me gusta que cada persona sienta que todo está cuidado, incluso aquello que no se ve.",
    image: "/images/team/angeles-albelda.png",
  },
  {
    name: "Sem Fernández",
    role: "Agente de propietarios",
    quote: "Detrás de cada vivienda hay una historia que merece ser entendida y defendida.",
    image: "/images/team/sem-fernandez.png",
  },
  {
    name: "Felipe Martínez",
    role: "Agente de propietarios",
    quote: "La confianza se construye hablando claro y estando cerca durante todo el camino.",
    image: "/images/team/felipe-martinez.png",
  },
  {
    name: "Jorge García",
    role: "Agente de compradores",
    quote: "Encontrar una casa también es descubrir el lugar donde alguien empezará una nueva etapa.",
    image: "/images/team/jorge-garcia.png",
  },
];

// Índices dentro de TEAM_MEMBERS, para referencia rápida.
const JORDI = 0;
const EVA = 1;
const ANGELES = 2;
const SEM = 3;
const FELIPE = 4;
const JORGE = 5;

/** Persona activa por defecto al cargar la sección -- Eva García. */
export const DEFAULT_ACTIVE_INDEX = EVA;

export type FanConfig = {
  /** Índice en TEAM_MEMBERS de la persona que ocupa esta posición del abanico. */
  personIndex: number;
  rotate: number;
  /** Desplazamiento vertical de reposo, en px -- siempre hacia abajo desde Eva/Jordi (0, el punto más alto). */
  restY: number;
  z: number;
};

// 2026-08-22: las seis tarjetas son EXACTAMENTE del mismo tamaño (ver
// --card-width/--card-height en WorkZoom.module.css) -- la jerarquía no
// se expresa con anchos/escalas distintos ni con opacidad reducida
// (retirado por completo), solo con rotación, curva vertical sutil
// (máx. 22px) y z-index. La posición HORIZONTAL ya no vive aquí como
// porcentaje -- el orden de este array (Sem·Ángeles·Eva·Jordi·Jorge·
// Felipe, izquierda -> derecha) más un solape fijo controlado en
// WorkZoom.module.css (flex + margin-left negativo, ~10% del ancho de
// tarjeta) son los que fijan la posición real, de forma predecible a
// cualquier ancho de contenedor. (Excepción acordada a "no tocar
// teamData.ts": solo esta geometría de presentación cambia --
// TEAM_MEMBERS, el orden de plantilla y el contenido siguen intactos.)
export const FAN_LAYOUT: FanConfig[] = [
  // Sem Fernández -- extremo izquierdo.
  { personIndex: SEM, rotate: -9, restY: 22, z: 1 },
  // Ángeles Albelda.
  { personIndex: ANGELES, rotate: -5, restY: 12, z: 3 },
  // Eva García -- centro (junto con Jordi, mismo protagonismo).
  { personIndex: EVA, rotate: -1.5, restY: 0, z: 5 },
  // Jordi Osca -- centro.
  { personIndex: JORDI, rotate: 1.5, restY: 0, z: 5 },
  // Jorge García.
  { personIndex: JORGE, rotate: 5, restY: 12, z: 3 },
  // Felipe Martínez -- extremo derecho.
  { personIndex: FELIPE, rotate: 9, restY: 22, z: 1 },
];

// Orden de navegación en móvil (imagen activa grande + miniaturas) --
// distinto del orden visual del abanico de escritorio y del orden de
// plantilla. Eva -> Jordi -> Ángeles -> Jorge -> Sem -> Felipe.
export const MOBILE_ORDER: number[] = [EVA, JORDI, ANGELES, JORGE, SEM, FELIPE];
