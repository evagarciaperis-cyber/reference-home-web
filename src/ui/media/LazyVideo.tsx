"use client";

import { useEffect, useRef, type Ref, type VideoHTMLAttributes } from "react";

// Vídeo que no se descarga hasta que está cerca de la pantalla (velocidad de la
// portada: antes los cuatro vídeos, ~40 MB, se bajaban nada más entrar).
// - En el HTML sale sin src y con preload="none": el navegador no pide nada.
// - Al acercarse a la pantalla (una pantalla antes) se le pone el src y se reproduce.
// - Fuera de la pantalla se pausa; al volver sigue donde iba.
// El elemento <video> es siempre el mismo, así que los hooks de animación que
// reciben su ref (clip-path, etc.) siguen funcionando igual.
type Props = Omit<VideoHTMLAttributes<HTMLVideoElement>, "src" | "preload" | "autoPlay"> & {
  src: string;
  ref?: Ref<HTMLVideoElement | null>;
  /** Margen para empezar a cargar antes de que se vea (por defecto, una pantalla). */
  margin?: string;
};

export function LazyVideo({ src, ref, margin = "100% 0px", muted = true, loop = true, playsInline = true, ...rest }: Props) {
  const own = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const v = own.current;
    if (!v) return;
    const start = () => {
      if (!v.getAttribute("src")) {
        v.setAttribute("src", src);
        v.preload = "auto";
      }
      v.play().catch(() => {});
    };
    if (!("IntersectionObserver" in window)) {
      start();
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) start();
        else if (v.getAttribute("src") && !v.paused) v.pause();
      },
      { rootMargin: margin },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [src, margin]);

  const setRef = (el: HTMLVideoElement | null) => {
    own.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) (ref as { current: HTMLVideoElement | null }).current = el;
  };

  return <video ref={setRef} preload="none" muted={muted} loop={loop} playsInline={playsInline} data-src={src} {...rest} />;
}
