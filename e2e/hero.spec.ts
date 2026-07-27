import { test, expect } from "@playwright/test";
import { HERO_NARRATIVE_VH } from "../src/motion/core/heroGeometry";

// Hero definitivo (docs/HERO_REDESIGN_SPEC.md, aprobado 2026-07-26). El
// Hero de paridad estricta anterior vive, deshabilitado, en
// e2e/hero.legacy.spec.ts (condición nº14 del encargo de implementación).

function isReduced(projectName: string): boolean {
  return projectName.endsWith("-reduced");
}

// Corrección 2026-07-27: la distancia de la narrativa (día/tarde/
// atardecer/noche) ya NO es "altura total del Hero menos un viewport" --
// desde que el contenedor del Hero mide HERO_TOTAL_VH viewports (500vh,
// heroGeometry.ts) en vez de 400vh, esa resta ya no coincide con la
// distancia real que usa useHero.ts. Se importa la misma constante que
// usa el propio hook para no volver a desincronizarse (fue exactamente
// el bug que causó el movimiento del Hero, corregido esta misma sesión).
async function scrollHeroFraction(page: import("@playwright/test").Page, frac: number) {
  const { heroDocTop, viewportHeight } = await page.evaluate(() => ({
    heroDocTop: window.scrollY + document.querySelector("#inicio")!.getBoundingClientRect().top,
    viewportHeight: window.innerHeight,
  }));
  const distance = HERO_NARRATIVE_VH * viewportHeight;
  await page.evaluate((y) => window.scrollTo({ top: y, left: 0, behavior: "instant" }), Math.round(heroDocTop + distance * frac));
  // Dos rAF para dar tiempo a que useHero recalcule tras el scroll.
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

// Corrección 2026-07-26 nº5 (imágenes definitivas 1536×768): las cuatro
// capas de fondo deben compartir bit a bit top/right/bottom/left/width/
// height/objectFit/objectPosition/transform/transformOrigin/clipPath --
// exactamente la lista pedida, leída con getComputedStyle() en el
// navegador real, no inferida del CSS fuente.
test("las cuatro capas de fondo comparten geometría idéntica (getComputedStyle)", async ({ page, baseURL }, testInfo) => {
  test.skip(isReduced(testInfo.project.name), "Solo hay una capa visible con reduced-motion (ver test dedicado)");
  await page.goto(new URL("/", baseURL).href);
  await page.waitForTimeout(300);

  const boxes = await page.locator("#inicio [aria-hidden='true'] img").evaluateAll((imgs) =>
    imgs.map((img) => {
      const cs = getComputedStyle(img);
      return {
        top: cs.top,
        right: cs.right,
        bottom: cs.bottom,
        left: cs.left,
        width: cs.width,
        height: cs.height,
        objectFit: cs.objectFit,
        objectPosition: cs.objectPosition,
        transform: cs.transform,
        transformOrigin: cs.transformOrigin,
        clipPath: cs.clipPath,
      };
    }),
  );
  expect(boxes).toHaveLength(4);
  for (const box of boxes.slice(1)) {
    expect(box).toEqual(boxes[0]);
  }
});

// Corrección 2026-07-27 (revisión definitiva): la salida del Hero ya NO
// es un fundido de color propio -- --hero-exit-opacity queda
// permanentemente en 0 (útil solo si algún día hiciera falta revertir) y
// es Manifesto, con z-index superior, quien lo cubre físicamente al
// subir. Este test sustituye al anterior ("no empieza antes de que la
// noche esté resuelta"), que comprobaba exactamente el mecanismo que se
// eliminó.
test("el Hero nunca se difumina por su cuenta -- Manifesto lo cubre físicamente, no por fundido", async ({
  page,
  baseURL,
}, testInfo) => {
  test.skip(isReduced(testInfo.project.name), "reduced-motion no tiene tramo de salida (ver test dedicado)");
  await page.goto(new URL("/", baseURL).href);
  await page.waitForSelector('[data-shell="preloader"]', { state: "hidden", timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(300);

  const readExit = () =>
    page.locator("#inicio").evaluate((el) => Number(getComputedStyle(el).getPropertyValue("--hero-exit-opacity")));

  // --hero-exit-opacity se mantiene en 0 en todo el recorrido, incluida
  // la propia ventana de cobertura de Manifesto -- nunca hay fundido.
  for (const frac of [0, 0.5, 0.9, 1, 1.2]) {
    await scrollHeroFraction(page, frac);
    expect(await readExit()).toBe(0);
  }

  // El header, físicamente: visible mientras Manifesto no ha llegado
  // arriba, cubierto (no por su propio opacity/transform, que siguen
  // intactos) una vez Manifesto completa su ascenso.
  const isHeaderPhysicallyVisible = () =>
    page.evaluate(() => {
      const header = document.querySelector("[data-header]")!;
      const rect = header.getBoundingClientRect();
      const topEl = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return !!(topEl && topEl.closest("[data-header]"));
    });
  const headerOwnStyle = () =>
    page.locator("[data-header]").evaluate((el) => {
      const cs = getComputedStyle(el);
      return { opacity: cs.opacity, transform: cs.transform };
    });

  await scrollHeroFraction(page, 0.5);
  expect(await isHeaderPhysicallyVisible()).toBe(true);
  expect(await headerOwnStyle()).toEqual({ opacity: "1", transform: "none" });

  // El wipe empieza en frac=1 (scrollY=HERO_NARRATIVE_VH viewports) y dura
  // 1 viewport más -- en términos de esta misma escala de frac (relativa
  // a HERO_NARRATIVE_VH viewports), eso es frac=1+1/HERO_NARRATIVE_VH.
  // Un poco más allá para dar margen al asentamiento del arrastre
  // amortiguado (useManifestoRise.ts).
  await scrollHeroFraction(page, 1 + 1.15 / HERO_NARRATIVE_VH);
  await page.waitForTimeout(700); // deja asentar el seguidor críticamente amortiguado
  expect(await isHeaderPhysicallyVisible()).toBe(false);
  // El header en sí sigue intacto detrás -- lo que cambió es qué hay
  // delante, nunca su propio opacity/transform.
  expect(await headerOwnStyle()).toEqual({ opacity: "1", transform: "none" });
});

test("copy definitivo: titular, énfasis serif, texto secundario y ambos CTA", async ({ page, baseURL }) => {
  await page.goto(new URL("/", baseURL).href);
  const hero = page.locator("#inicio");

  await expect(hero.locator("h1")).toContainText("Hay viviendas que solo necesitan ser vistas");
  await expect(hero.locator("h1 em")).toHaveText("de otra manera");
  await expect(hero.locator("h1 em")).toHaveCSS("font-style", "italic");

  await expect(hero.getByText("Diseñamos la estrategia, la imagen y el proceso de venta")).toBeVisible();

  const primary = hero.getByRole("link", { name: "Valora tu vivienda" });
  await expect(primary).toBeVisible();
  const secondary = hero.getByRole("link", { name: /Descubre cómo trabajamos/ });
  await expect(secondary).toBeVisible();
});

test("fondo: las cuatro fotografías de la vivienda están presentes", async ({ page, baseURL }) => {
  await page.goto(new URL("/", baseURL).href);
  const bgImages = page.locator("#inicio [aria-hidden='true'] img");
  await expect(bgImages).toHaveCount(4);
  for (const img of await bgImages.all()) {
    await expect(img).toHaveAttribute("alt", "");
  }
});

test("crossfade: el estado día domina al inicio del recorrido del Hero", async ({ page, baseURL }, testInfo) => {
  test.skip(isReduced(testInfo.project.name), "reduced-motion fija el estado atardecer (ver test dedicado)");
  await page.goto(new URL("/", baseURL).href);
  await page.waitForTimeout(300);

  // Orden real en el DOM (Hero.tsx): día(0), tarde(1), atardecer(2), noche(3).
  const day = page.locator("#inicio img").nth(0);
  const night = page.locator("#inicio img").nth(3);
  await expect
    .poll(async () => Number(await day.evaluate((el) => getComputedStyle(el).opacity)))
    .toBeGreaterThan(0.9);
  await expect
    .poll(async () => Number(await night.evaluate((el) => getComputedStyle(el).opacity)))
    .toBeLessThan(0.1);
});

test("crossfade: el estado noche domina al final del recorrido del Hero", async ({ page, baseURL }, testInfo) => {
  test.skip(isReduced(testInfo.project.name), "reduced-motion fija el estado atardecer (ver test dedicado)");
  await page.goto(new URL("/", baseURL).href);

  // Corrección 2026-07-27: hay que llegar al final de la NARRATIVA
  // (HERO_NARRATIVE_VH viewports), no al final del contenedor de 500vh
  // -- este último incluye el tramo de cola donde el Hero ya no cambia.
  await scrollHeroFraction(page, 1);
  await page.waitForTimeout(400);

  const day = page.locator("#inicio img").nth(0);
  const night = page.locator("#inicio img").nth(3);
  await expect
    .poll(async () => Number(await day.evaluate((el) => getComputedStyle(el).opacity)))
    .toBeLessThan(0.1);
  await expect
    .poll(async () => Number(await night.evaluate((el) => getComputedStyle(el).opacity)))
    .toBeGreaterThan(0.9);
});

test("reduced-motion: estado estático en atardecer, sin día ni noche visibles", async ({ page, baseURL }, testInfo) => {
  test.skip(!isReduced(testInfo.project.name), "Solo aplica con prefers-reduced-motion");
  await page.goto(new URL("/", baseURL).href);

  // Orden real en el DOM (Hero.tsx): día(0), tarde(1), atardecer(2), noche(3).
  const day = page.locator("#inicio img").nth(0);
  const tarde = page.locator("#inicio img").nth(1);
  const dusk = page.locator("#inicio img").nth(2);
  const night = page.locator("#inicio img").nth(3);
  await expect(day).toHaveCSS("opacity", "0");
  await expect(tarde).toHaveCSS("opacity", "0");
  await expect(dusk).toHaveCSS("opacity", "1");
  await expect(night).toHaveCSS("opacity", "0");
});

test("encuadre móvil: object-position 70% center por debajo de 768px", async ({ page, baseURL }) => {
  await page.goto(new URL("/", baseURL).href);
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("Sin viewport");
  test.skip(viewport.width >= 768, "Solo aplica en el breakpoint móvil");

  const day = page.locator("#inicio img").nth(0);
  // El navegador normaliza la palabra clave "center" a "50%" en el valor
  // computado -- "70% center" (el valor de origen en CSS) nunca aparece
  // literalmente en getComputedStyle().
  await expect(day).toHaveCSS("object-position", "70% 50%");
});

test("interacción con Header: el Hero lo marca como on-dark (scrim constante)", async ({ page, baseURL }) => {
  await page.goto(new URL("/", baseURL).href);
  await page.waitForSelector('[data-shell="preloader"]', { state: "hidden", timeout: 3000 }).catch(() => {});
  const header = page.locator("[data-header]");
  // El Hero ahora es una sección oscura (fondo fotográfico + scrim
  // constante) por diseño (docs/HERO_REDESIGN_SPEC.md, sección 9) -- lo
  // contrario del Hero anterior, que era una sección clara.
  await expect(header).toHaveClass(/onDark/);
});

test("interacción con NoiseOverlay: sigue presente sobre el Hero", async ({ page, baseURL }) => {
  await page.goto(new URL("/", baseURL).href);
  const noise = page.locator('[data-shell="noise"]');
  await expect(noise).toBeAttached();
  await expect(noise).toHaveCSS("z-index", "1000");
});

test("CTA principal: es magnético y responde al cursor", async ({ page, baseURL }, testInfo) => {
  test.skip(isReduced(testInfo.project.name), "El hook se desactiva con prefers-reduced-motion");
  await page.goto(new URL("/", baseURL).href);
  await page.waitForSelector('[data-shell="preloader"]', { state: "hidden", timeout: 3000 }).catch(() => {});

  const primary = page.getByRole("link", { name: "Valora tu vivienda" });
  const box = await primary.boundingBox();
  if (!box) throw new Error("No se pudo medir el CTA principal");
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;

  await page.mouse.move(centerX, centerY);
  await page.mouse.move(centerX + 20, centerY + 10);
  await expect.poll(() => primary.evaluate((el) => (el as HTMLElement).style.transform)).not.toBe("");

  await page.mouse.move(10, 10);
  await expect.poll(() => primary.evaluate((el) => (el as HTMLElement).style.transform)).toBe("");
});

test("ambos CTA son accesibles por teclado con foco visible", async ({ page, baseURL }) => {
  await page.goto(new URL("/", baseURL).href);
  const primary = page.getByRole("link", { name: "Valora tu vivienda" });
  const secondary = page.getByRole("link", { name: /Descubre cómo trabajamos/ });

  await primary.focus();
  await expect(primary).toBeFocused();
  await expect(primary).toHaveCSS("outline-style", "solid");

  await secondary.focus();
  await expect(secondary).toBeFocused();
  await expect(secondary).toHaveCSS("outline-style", "solid");
});

test("wordmark del Header: logotipo Reference Home", async ({ page, baseURL }) => {
  await page.goto(new URL("/", baseURL).href);
  const brand = page.locator("[data-header] a[aria-label='Volver al inicio']");
  await expect(brand.locator("img")).toHaveAttribute("alt", "Reference Home");
});
