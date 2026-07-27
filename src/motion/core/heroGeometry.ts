// Referencia geométrica compartida entre useHero.ts (narrativa día → tarde
// → atardecer → noche) y useManifestoRise.ts (ascenso de Manifesto sobre
// el Hero). Desalinear estos dos números fue la causa exacta del bug
// 2026-07-27: el Hero usaba `alturaTotal - 1 viewport` como distancia de
// su narrativa, que ANTES coincidía con el punto en que su propio sticky
// se soltaba -- y Manifesto empezaba a subir justo en ese mismo punto, así
// que para casi todo el ascenso el Hero ya se había desenganchado y subía
// con la página en vez de quedarse fijo detrás.
//
// HERO_NARRATIVE_VH: cuántos "viewports" de scroll dura la narrativa de
// luz (STAGE en useHero.ts) -- ANTES de este cambio, esto era implícito
// (altura total del Hero menos un viewport, con el Hero midiendo 400vh).
// Se hace explícito aquí para que pueda mantenerse fijo aunque la altura
// TOTAL del contenedor del Hero crezca para darle sitio al ascenso.
export const HERO_NARRATIVE_VH = 3;

// HERO_TAIL_VH: viewports adicionales que necesita Manifesto para
// completar su ascenso mientras el Hero sigue pinneado. Debe coincidir
// con la wipeDistance real de useManifestoRise.ts (un viewport completo).
export const HERO_TAIL_VH = 1;

// Altura total del contenedor del Hero (Hero.module.css): la narrativa
// más el tramo de cola, más el propio viewport que el sticky necesita
// para poder pinnearse en primer lugar -- para que el sticky del Hero no
// pueda soltarse hasta que Manifesto ya lo haya cubierto por completo.
export const HERO_TOTAL_VH = HERO_NARRATIVE_VH + HERO_TAIL_VH + 1;

// Corrección 2026-07-27 (segunda parte): alargar el contenedor del Hero
// para que su sticky no se suelte antes de tiempo tiene un efecto
// colateral -- Manifesto, que vive justo después en el flujo del
// documento, también empieza a recibir su posición natural HERO_TAIL_VH
// viewports más tarde de lo que useManifestoRise.ts espera (su avance
// natural con el scroll ya no llega a top:0 al final de la ventana de
// HERO_TAIL_VH viewports, sino un viewport entero más tarde). Ese
// viewport de diferencia es exactamente HERO_TAIL_VH y hay que
// compensarlo explícitamente en useManifestoRise.ts, no asumir que
// "offset en 0" equivale a "ya ha llegado".
