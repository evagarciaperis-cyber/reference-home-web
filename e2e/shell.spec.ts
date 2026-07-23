import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { freezeAnimation } from "./utils/settle";
import { compareScreenshots } from "./utils/diff";

const ORACLE_DIR = path.join(__dirname, "oracle");
const CAPTURES_DIR = path.join(__dirname, "__captures__");
const PARITY_THRESHOLD = 0.001;

// Fase 2: valida el shell global (Preloader, NoiseOverlay, CustomCursor) de
// forma aislada, sin depender de que la home esté migrada. El Preloader es
// una pantalla completa y opaca (z-index 2000) que cubre cualquier
// contenido detrás — por eso comparar el instante en que está visible SÍ es
// una comparación de paridad válida ahora mismo, aunque la home esté vacía.

test("preloader: paridad visual en el instante inicial", async ({ page, baseURL }, testInfo) => {
  test.skip(
    testInfo.project.name.endsWith("-reduced"),
    "Con prefers-reduced-motion el delay es 0ms (assets/js/main.js): el preloader se oculta " +
      "casi instantáneamente (<40ms, comprobado empíricamente) y no hay una foto intermedia " +
      "estable que comparar. La paridad de este caso se valida por comportamiento en el " +
      'test "preloader: se oculta tras la secuencia de carga", no por píxel.',
  );

  const oraclePath = path.join(ORACLE_DIR, `preloader-${testInfo.project.name}-home.png`);
  test.skip(
    !existsSync(oraclePath),
    `No existe oráculo para "preloader-${testInfo.project.name}-home". Ejecuta "npm run parity:update-oracle-shell".`,
  );
  const oracleBuf = readFileSync(oraclePath);

  await page.goto(new URL("/", baseURL).href);
  await page.waitForSelector('[data-shell="preloader"]');
  await freezeAnimation(page, '[data-shell="preloader-progress"]');
  const currentBuf = await page.screenshot();

  mkdirSync(path.join(CAPTURES_DIR, "current"), { recursive: true });
  writeFileSync(path.join(CAPTURES_DIR, "current", `preloader-${testInfo.project.name}-home.png`), currentBuf);

  const diffPath = path.join(CAPTURES_DIR, "diff", `preloader-${testInfo.project.name}-home.png`);
  const { diffRatio, diffPixels, totalPixels } = compareScreenshots(oracleBuf, currentBuf, diffPath);
  await testInfo.attach(`diff-preloader-${testInfo.project.name}`, { path: diffPath, contentType: "image/png" });
  console.log(
    `[shell/preloader] ${testInfo.project.name}: ${(diffRatio * 100).toFixed(3)}% (${diffPixels}/${totalPixels}px)`,
  );

  expect(diffRatio, 'paridad visual del preloader — revisa el diff adjunto').toBeLessThan(PARITY_THRESHOLD);
});

test("preloader: se oculta tras la secuencia de carga", async ({ page, baseURL }) => {
  await page.goto(new URL("/", baseURL).href);
  const preloader = page.locator('[data-shell="preloader"]');
  await expect(preloader).toBeVisible();
  // 780ms (assets/js/main.js) + margen de la transición de salida (1s + 0.25s delay).
  await expect(preloader).toHaveCSS("transform", /matrix/, { timeout: 3000 });
});

test("noise: propiedades computadas coinciden con el diseño original", async ({ page, baseURL }) => {
  await page.goto(new URL("/", baseURL).href);
  const noise = page.locator('[data-shell="noise"]');
  await expect(noise).toHaveCSS("position", "fixed");
  await expect(noise).toHaveCSS("z-index", "1000");
  await expect(noise).toHaveCSS("opacity", "0.03");
  await expect(noise).toHaveCSS("pointer-events", "none");
});

test("cursor: aparece sobre un elemento data-cursor y usa su texto", async ({ page, baseURL }) => {
  await page.goto(new URL("/", baseURL).href);

  // El preloader es pantalla completa y opaca (z-index 2000, sin
  // pointer-events:none): mientras esté visible intercepta cualquier
  // movimiento de ratón, igual que le pasaría a un usuario real. Hay que
  // esperar a que termine su secuencia de salida antes de simular el hover.
  await page.waitForSelector('[data-shell="preloader"]', { state: "hidden", timeout: 3000 }).catch(() => {});

  // La Fase 2 no incluye todavía contenido con data-cursor (llegará con las
  // tarjetas de proyecto en fases posteriores): se añade un elemento de
  // prueba temporal para validar la delegación de eventos del hook.
  await page.evaluate(() => {
    const probe = document.createElement("button");
    probe.dataset.cursor = "Probar";
    probe.id = "cursor-probe";
    probe.style.cssText = "position:fixed;top:50%;left:50%;width:40px;height:40px;";
    document.body.appendChild(probe);
  });

  const probe = page.locator("#cursor-probe");
  const box = await probe.boundingBox();
  if (!box) throw new Error("No se pudo medir el elemento de prueba");

  const cursor = page.locator('[data-shell="cursor"]');
  const label = page.locator('[data-shell="cursor-label"]');

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await expect(cursor).toHaveClass(/isVisible/);
  await expect(label).toHaveText("Probar");

  await page.mouse.move(10, 10);
  await expect(cursor).not.toHaveClass(/isVisible/);
});

test("cursor: oculto en pantallas ≤640px (styles.css, corrección Fase 2)", async ({ page, baseURL }) => {
  const viewport = page.viewportSize();
  test.skip(!viewport || viewport.width > 640, "La regla solo aplica a viewports ≤640px");

  await page.goto(new URL("/", baseURL).href);
  await expect(page.locator('[data-shell="cursor"]')).toHaveCSS("display", "none");
});
