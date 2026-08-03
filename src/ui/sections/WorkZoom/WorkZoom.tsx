"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { useTeamFanEntrance } from "@/motion/hooks/useTeamFanEntrance";
import { TEAM_MEMBERS, FAN_LAYOUT, MOBILE_ORDER, DEFAULT_ACTIVE_INDEX, type FanConfig } from "./teamData";
import styles from "./WorkZoom.module.css";

// Solo el estado REACTIVO al hover/foco/tap -- rotación y curva vertical
// de reposo viven en FAN_LAYOUT. Las seis tarjetas tienen EXACTAMENTE el
// mismo tamaño (--card-width/--card-height en WorkZoom.module.css) y
// SIEMPRE opacity:1/sin filtro -- la jerarquía nunca se expresa con
// anchos, escalas de reposo ni transparencia. La entrada del abanico
// (desplegarse desde el centro) la anima GSAP sobre el wrapper exterior
// (.cardSlot, useTeamFanEntrance.ts) -- este botón interior nunca compite
// con GSAP por la propiedad transform, cada uno anima un nodo distinto.
function cardStyle(cfg: FanConfig, slotIndex: number, activeSlotIndex: number): CSSProperties {
  const isActive = slotIndex === activeSlotIndex;

  if (isActive) {
    return {
      zIndex: 20,
      opacity: 1,
      filter: "none",
      boxShadow: "0 26px 52px rgba(20, 16, 14, .26)",
      transform: "translateY(-8px) rotate(0deg) scale(1.07)",
    };
  }

  // Inactiva -- nítida y opaca por completo, solo conserva su rotación
  // y curva vertical de reposo. No se encoge, no cambia de tamaño, no
  // se desplaza bruscamente, no se atenúa.
  return {
    zIndex: cfg.z,
    opacity: 1,
    filter: "none",
    boxShadow: "0 10px 26px rgba(38, 30, 26, .1)",
    transform: `translateY(${cfg.restY}px) rotate(${cfg.rotate}deg) scale(1)`,
  };
}

// 2026-08-21: bloque "Nuestro equipo" -- una única escena de ~100svh con
// pin propio corto (useTeamFanEntrance.ts, independiente del de
// Process). Tres franjas: cabecera, abanico, banda de información
// activa. Jerarquía visual del abanico (Eva/Jordi al centro con el
// mismo protagonismo, Ángeles/Jorge alrededor, Sem/Felipe en los
// extremos) y el orden de navegación en móvil viven en teamData.ts
// (FAN_LAYOUT/MOBILE_ORDER) -- este componente solo itera esos órdenes,
// nunca reordena TEAM_MEMBERS.
//
// Cada tarjeta son DOS nodos: [data-fan-card] (wrapper exterior, un
// simple item de flex -- su posición horizontal la da el orden en
// FAN_LAYOUT + el solape controlado de .fan en WorkZoom.module.css, no
// un left/top calculado a mano; GSAP anima SU opacity/x/y/rotation/scale
// para la entrada, dentro del pin) y el <button> interior (hover/foco/
// tap, estado de React puro vía cardStyle() de arriba). Nunca el mismo
// nodo, para que React y GSAP no compitan por la misma propiedad
// transform.
//
// Three.js: la infraestructura para enriquecer el retrato activo ya
// existe y es reutilizable (src/motion/webgl/useTeamPortraitScene.ts +
// teamPortraitShaders.ts, construidos sobre useThreeScene.ts) pero
// -- siguiendo la vía explícita que permite el propio encargo original
// -- esta versión del abanico sigue siendo 100% CSS + GSAP.
export function WorkZoom() {
  const { sectionRef } = useTeamFanEntrance();
  const [hoverPerson, setHoverPerson] = useState<number | null>(null);
  const [focusPerson, setFocusPerson] = useState<number | null>(null);
  const [lockedPerson, setLockedPerson] = useState(DEFAULT_ACTIVE_INDEX);

  const activeIndex = hoverPerson ?? focusPerson ?? lockedPerson; // índice en TEAM_MEMBERS
  const active = TEAM_MEMBERS[activeIndex];
  const activeSlotIndex = FAN_LAYOUT.findIndex((cfg) => cfg.personIndex === activeIndex);

  const cardStyles = useMemo(
    () => FAN_LAYOUT.map((cfg, slot) => cardStyle(cfg, slot, activeSlotIndex)),
    [activeSlotIndex],
  );

  return (
    <section className={styles.experience} aria-label="Nuestro equipo" ref={sectionRef}>
      <div className={styles.scene}>
        <div className={styles.header} data-fan-header>
          <div className={styles.headerText}>
            <h2 className={styles.title}>
              Conoce a las personas
              <br />
              <em>detrás de cada decisión.</em>
            </h2>
          </div>
          <p className={styles.support} data-fan-support>
            Experiencia, criterio y cercanía
            <br />
            en cada paso del camino.
          </p>
        </div>

        <div className={styles.stage}>
          <div className={styles.fan} role="group" aria-label="Retratos del equipo">
            {FAN_LAYOUT.map((cfg, slot) => {
              const member = TEAM_MEMBERS[cfg.personIndex];
              return (
                <div key={member.name} className={styles.cardSlot} data-fan-card>
                  <button
                    type="button"
                    className={styles.card}
                    style={cardStyles[slot]}
                    onMouseEnter={() => setHoverPerson(cfg.personIndex)}
                    onMouseLeave={() => setHoverPerson(null)}
                    onFocus={() => setFocusPerson(cfg.personIndex)}
                    onBlur={() => setFocusPerson(null)}
                    onClick={() => setLockedPerson(cfg.personIndex)}
                    aria-pressed={activeIndex === cfg.personIndex}
                    aria-label={`Ver a ${member.name}, ${member.role}`}
                  >
                    <img className={styles.cardImage} src={member.image} alt="" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Miniaturas para tablet/móvil -- orden de navegación propio
              (MOBILE_ORDER), no el del abanico ni el de TEAM_MEMBERS. El
              abanico en sí se oculta por CSS por debajo de 901px. */}
          <div className={styles.mobileActive} aria-hidden="true">
            <img className={styles.mobileActiveImage} src={active.image} alt="" />
          </div>
          <div className={styles.mobileThumbs} role="tablist" aria-label="Elegir persona del equipo">
            {MOBILE_ORDER.map((personIndex) => {
              const member = TEAM_MEMBERS[personIndex];
              return (
                <button
                  key={member.name}
                  type="button"
                  className={styles.mobileThumb}
                  data-active={activeIndex === personIndex || undefined}
                  onClick={() => setLockedPerson(personIndex)}
                  aria-pressed={activeIndex === personIndex}
                  aria-label={`Ver a ${member.name}, ${member.role}`}
                >
                  <img className={styles.mobileThumbImage} src={member.image} alt="" />
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.activeBand} data-fan-band>
          <div className={styles.activeIdentity}>
            <span className={styles.infoNumber}>{String(activeIndex + 1).padStart(2, "0")}</span>
            <h3 className={styles.infoName}>{active.name}</h3>
            <p className={styles.infoRole}>{active.role}</p>
          </div>

          <div className={styles.activeQuote} aria-live="polite">
            <span className={styles.quoteMark} aria-hidden="true">
              &ldquo;
            </span>
            <p className={styles.infoQuote}>{active.quote}</p>
          </div>

          <div className={styles.activeClosing}>
            <p className={styles.closingPhrase}>
              Personas distintas.
              <br />
              Una misma manera de acompañarte.
            </p>
            {/* TODO: conectar con experiencia interna del equipo -- no
                existe esa página/ruta todavía, no se inventa una.
                href="#" temporal, navegación prevenida a propósito. */}
            <a className={styles.closingCta} href="#" onClick={(event) => event.preventDefault()}>
              Conoce quién te acompañará
              <svg className={styles.closingCtaArrow} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                <path
                  d="M3.5 12.5 L12.5 3.5 M6 3.5 H12.5 V10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
