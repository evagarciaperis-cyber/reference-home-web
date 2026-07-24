// Evento DOM genérico y compartido para el caso especial que ya anticipaba
// el comentario de useHeaderState (fase 3): una sección puede necesitar que
// el header recalcule su estado "on-dark" en el mismo frame en que ella
// cambia, sin esperar al próximo scroll -- igual que el original llama a
// updateHeader() explícitamente dentro de renderWorkZoom() cuando
// work-zoom cruza el umbral de inmersión (main.js). Header no sabe nada de
// WorkZoom ni de ninguna otra sección concreta: solo escucha este evento
// genérico, igual que escucha "scroll".
export const HEADER_TONE_REFRESH_EVENT = "reference-home:header-tone-refresh";

export function requestHeaderToneRefresh(): void {
  window.dispatchEvent(new Event(HEADER_TONE_REFRESH_EVENT));
}
