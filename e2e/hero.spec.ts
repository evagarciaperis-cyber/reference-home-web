import { test, expect } from "@playwright/test";

// Hero definitivo (docs/HERO_REDESIGN_SPEC.md, aprobado 2026-07-26). El
// Hero de paridad estricta anterior vive, deshabilitado, en
// e2e/hero.legacy.spec.ts (condición nº14 del encargo de implementación).

function isReduced(projectName: string): boolean {
  return projectName.endsWith("-reduced");
}

async function scrollHeroFraction(page: import("@playwright/test").Page, frac: number) {
  const { heroHeight, viewportHeight } = await page.evaluate(() => ({
    heroHeight: document.querySelector("#inicio")!.getBoundingClientRect().height,
    viewportHeight: window.innerHeight,
  }));
  const distance = heroHeight - viewportHeight;
  await page.evaluate((y) => window.scrollTo({ top: y, left: 0, behavior: "instant" }), Math.round(distance * frac));
  // Dos rAF para dar tiempo a que useHero recalcule tras el scroll.
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

// Corrección 2026-07-26, punto TERCERO del encargo: las tres capas de fondo
// deben compartir exactamente la misma caja/escala/recorte -- ninguna
// puede tener su propio transform, object-position o redondeo de
// dimensiones distinto de las otras dos.
test("las tres capas de fondo comparten caja, escala y recorte idénticos", async ({ page, baseURL }, testInfo) => {
  test.skip(isReduced(testInfo.project.name), "Solo hay una capa visible con reduced-motion (ver test dedicado)");
  await page.goto(new URL("/", baseURL).href);
  await page.waitForTimeout(300);

  const boxes = await page.locator("#inicio [aria-hidden='true'] img").evaluateAll((imgs) =>
    imgs.map((img) => {
      const r = img.getBoundingClientRect();
      const cs = getComputedStyle(img);
      return { x: r.x, y: r.y, w: r.width, h: r.height, objectFit: cs.objectFit, objectPosition: cs.objectPosition, transform: cs.transform };
    }),
  );
  expect(boxes).toHaveLength(3);
  for (const box of boxes.slice(1)) {
    expect(box).toEqual(boxes[0]);
  }
});

// Corrección 2026-07-26, punto QUINTO: la salida hacia Manifesto no puede
// empezar mientras la luz todavía está cambiando -- solo a partir de que
// la noche ya está resuelta al 100% (progreso > 0.88).
test("la salida hacia Manifesto no empieza antes de que la noche esté resuelta", async ({ page, baseURL }, testInfo) => {
  test.skip(isReduced(testInfo.project.name), "reduced-motion no tiene tramo de salida (ver test dedicado)");
  await page.goto(new URL("/", baseURL).href);
  await page.waitForTimeout(300);

  const readExit = () =>
    page.locator("#inicio").evaluate((el) => Number(getComputedStyle(el).getPropertyValue("--hero-exit-opacity")));

  await scrollHeroFraction(page, 0.75); // noche recién resuelta
  expect(await readExit()).toBe(0);

  await scrollHeroFraction(page, 0.87); // todavía dentro del tramo "noche estable"
  expect(await readExit()).toBe(0);

  await scrollHeroFraction(page, 0.94); // dentro del tramo de salida
  expect(await readExit()).toBeGreaterThan(0);
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

test("fondo: las tres fotografías de la vivienda están presentes", async ({ page, baseURL }) => {
  await page.goto(new URL("/", baseURL).href);
  const bgImages = page.locator("#inicio [aria-hidden='true'] img");
  await expect(bgImages).toHaveCount(3);
  for (const img of await bgImages.all()) {
    await expect(img).toHaveAttribute("alt", "");
  }
});

test("crossfade: el estado día domina al inicio del recorrido del Hero", async ({ page, baseURL }, testInfo) => {
  test.skip(isReduced(testInfo.project.name), "reduced-motion fija el estado atardecer (ver test dedicado)");
  await page.goto(new URL("/", baseURL).href);
  await page.waitForTimeout(300);

  const day = page.locator("#inicio img").nth(0);
  const night = page.locator("#inicio img").nth(2);
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

  const heroHeight = await page.locator("#inicio").evaluate((el) => el.getBoundingClientRect().height);
  await page.evaluate((y) => window.scrollTo({ top: y, left: 0, behavior: "instant" }), heroHeight);
  await page.waitForTimeout(400);

  const day = page.locator("#inicio img").nth(0);
  const night = page.locator("#inicio img").nth(2);
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

  const day = page.locator("#inicio img").nth(0);
  const dusk = page.locator("#inicio img").nth(1);
  const night = page.locator("#inicio img").nth(2);
  await expect(day).toHaveCSS("opacity", "0");
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

test("wordmark del Header: REFERENCE HOME", async ({ page, baseURL }) => {
  await page.goto(new URL("/", baseURL).href);
  const brand = page.locator("[data-header] a", { hasText: "REFERENCE" }).first();
  await expect(brand).toContainText("REFERENCE");
  await expect(brand).toContainText("HOME");
});
