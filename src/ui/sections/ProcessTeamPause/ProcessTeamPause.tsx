import styles from "./ProcessTeamPause.module.css";

// 2026-08-21: separación editorial simple entre Process y el bloque de
// equipo (WorkZoom) -- tras tres intentos fallidos de un efecto de
// plegado/handoff animado entre ambos (ver el historial de
// useProcess.ts), se abandonó esa idea por completo a favor de dos
// secciones estables e independientes con un respiro visual entre
// medias. Sin imagen, sin texto, sin pin, sin ScrollTrigger, sin JS --
// solo espacio real en el documento (nunca márgenes negativos/offsets)
// con el mismo fondo crema con el que arranca WorkZoom, para que la
// transición de color entre Process (verde oscuro) y esta pausa sea la
// única "animación", y la de esta pausa a WorkZoom sea invisible (mismo
// tono).
export function ProcessTeamPause() {
  return <section aria-hidden="true" className={styles.pause} />;
}
