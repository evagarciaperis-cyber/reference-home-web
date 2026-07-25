import { test, expect } from "@playwright/test";

// Fase 15: metadata técnica mínima. Estos tests solo comprueban que las
// etiquetas declaradas en layout.tsx/page.tsx/not-found.tsx llegan al HTML
// servido y no rompen nada -- no son pruebas de "estrategia SEO", solo de
// que la metadata técnica está donde debe estar.

test("home: title, description, viewport y theme-color", async ({ page, baseURL }) => {
  await page.goto(new URL("/", baseURL).href);

  await expect(page).toHaveTitle("Reference Study — Experiencia digital");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "Estudio web independiente de una experiencia editorial y cinética. Proyecto estático listo para FTP.",
  );
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute("content", /width=device-width/);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#11110f");
});

test("home: robots index/follow y canonical", async ({ page, baseURL }) => {
  await page.goto(new URL("/", baseURL).href);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /index/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /follow/);
  const canonical = page.locator('link[rel="canonical"]');
  await expect(canonical).toHaveAttribute("href", /\/$/);
});

test("home: Open Graph y Twitter básicos", async ({ page, baseURL }) => {
  await page.goto(new URL("/", baseURL).href);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    "Reference Study — Experiencia digital",
  );
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content", "website");
  await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute("content", "Reference Study");
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary");
});

test("home: favicon SVG servido", async ({ page, baseURL }) => {
  await page.goto(new URL("/", baseURL).href);
  const iconLink = page.locator('link[rel="icon"][type="image/svg+xml"]');
  await expect(iconLink).toHaveCount(1);
  const href = await iconLink.getAttribute("href");
  expect(href).toBeTruthy();
  const response = await page.request.get(new URL(href!, baseURL).href);
  expect(response.status()).toBe(200);
});

test("404: title propio y robots noindex, no hereda el de la home", async ({ page, baseURL }) => {
  await page.goto(new URL("/esta-ruta-no-existe", baseURL).href);
  await expect(page).toHaveTitle("Página no encontrada — Reference Study");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("sin errores de consola ni de hidratación en la home", async ({ page, baseURL }) => {
  const messages: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") messages.push(msg.text());
  });
  page.on("pageerror", (err) => messages.push(err.message));

  await page.goto(new URL("/", baseURL).href);
  await page.waitForSelector('[data-shell="preloader"]', { state: "hidden", timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(500);

  expect(messages, `errores de consola inesperados: ${messages.join(" | ")}`).toEqual([]);
});
