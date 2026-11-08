"use client";

import { useEffect, useState } from "react";
import styles from "./BlogLatest.module.css";

// Últimas entradas del blog. El blog (mini-crm-referencehome/blog) genera
// /blog/ultimas.json con las tres más recientes cada vez que se publica desde
// el CRM; la home lo lee al cargar, así que se actualiza sola sin volver a
// generarla. Si el archivo no está (o falla), la sección no se muestra.

type Entry = {
  title: string;
  url: string;
  date: string;
  category: string;
  excerpt: string;
  cover: string;
  coverAlt: string;
  minutes: number;
};

const fmt = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });

const isEntry = (e: unknown): e is Entry => {
  const o = e as Record<string, unknown>;
  return !!o && typeof o.title === "string" && typeof o.url === "string" && o.url.startsWith("/blog/") && typeof o.cover === "string" && o.cover.startsWith("/blog/");
};

export function BlogLatest() {
  const [entries, setEntries] = useState<Entry[] | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/blog/ultimas.json", { signal: ctrl.signal, cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: unknown) => setEntries(Array.isArray(data) ? data.filter(isEntry).slice(0, 3) : []))
      .catch(() => setEntries([]));
    return () => ctrl.abort();
  }, []);

  if (!entries?.length) return null;

  return (
    <section className={styles.section} aria-labelledby="blog-latest-title">
      <div className={styles.inner}>
        <header className={styles.head}>
          <p className={styles.kicker}>Blog</p>
          <h2 id="blog-latest-title" className={styles.title}>
            Antes de vender, <em>entiende el proceso</em>
          </h2>
          <a className={styles.all} href="/blog/">
            Ver todos los artículos <span aria-hidden="true">→</span>
          </a>
        </header>
        <ul className={styles.grid}>
          {entries.map((e) => (
            <li key={e.url}>
              <a className={styles.card} href={e.url}>
                <span className={styles.media}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={e.cover} alt={e.coverAlt} loading="lazy" decoding="async" width={1500} height={1000} />
                </span>
                <span className={styles.meta}>
                  {e.category} · <time dateTime={e.date}>{fmt(e.date)}</time>
                </span>
                <span className={styles.cardTitle}>{e.title}</span>
                <span className={styles.excerpt}>{e.excerpt}</span>
                <span className={styles.more}>
                  Leer · {e.minutes} min <span aria-hidden="true">→</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
