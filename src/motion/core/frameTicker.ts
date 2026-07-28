// Registro compartido de callbacks por-frame (2026-07-27): permite que
// hooks que necesitan interpolar cada frame (p.ej. useAmbientMotion.ts,
// lerp del puntero) enganchen su actualización al ÚNICO
// requestAnimationFrame que SmoothScrollProvider.tsx ya mantiene vivo para
// conducir lenis.raf() -- en vez de que cada uno abra su propio bucle
// RAF independiente. SmoothScrollProvider llama a tick(time) una vez por
// frame; nadie más debe llamarlo.

type FrameCallback = (time: number) => void;

const callbacks = new Set<FrameCallback>();

export function subscribeFrame(callback: FrameCallback): () => void {
  callbacks.add(callback);
  return () => {
    callbacks.delete(callback);
  };
}

export function tick(time: number): void {
  callbacks.forEach((callback) => callback(time));
}
