import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { ROUTES, PARITY_THRESHOLD } from "./matrix";
import { settle } from "./utils/settle";
import { compareScreenshots } from "./utils/diff";

const ORACLE_DIR = path.join(__dirname, "oracle");
const CAPTURES_DIR = path.join(__dirname, "__captures__");

for (const route of ROUTES) {
  test(`sanity: captura determinista — ${route.name}`, async ({ page, baseURL }, testInfo) => {
    // No depende del oráculo: solo confirma que capturar la misma página dos
    // veces seguidas produce el mismo resultado. Si esto falla, el problema
    // está en la herramienta (o en una animación no controlada), no en la
    // paridad con web-nueva.
    const url = new URL(route.currentPath, baseURL).href;
    await page.goto(url);
    await settle(page);
    const first = await page.screenshot();

    await page.goto(url);
    await settle(page);
    const second = await page.screenshot();

    const diffPath = path.join(CAPTURES_DIR, "diff", `${testInfo.project.name}-${route.name}-sanity.png`);
    const { diffRatio } = compareScreenshots(first, second, diffPath);
    expect(diffRatio, "dos capturas seguidas de la misma página deben ser idénticas").toBeLessThan(0.0005);
  });

  test(`paridad — ${route.name}`, async ({ page, baseURL }, testInfo) => {
    const oraclePath = path.join(ORACLE_DIR, `${testInfo.project.name}-${route.name}.png`);
    test.skip(
      !existsSync(oraclePath),
      `No existe oráculo para "${testInfo.project.name}-${route.name}". Ejecuta "npm run parity:update-oracle".`,
    );

    const oracleBuf = readFileSync(oraclePath);

    await page.goto(new URL(route.currentPath, baseURL).href);
    await settle(page);
    const currentBuf = await page.screenshot();

    mkdirSync(path.join(CAPTURES_DIR, "current"), { recursive: true });
    writeFileSync(path.join(CAPTURES_DIR, "current", `${testInfo.project.name}-${route.name}.png`), currentBuf);

    const diffPath = path.join(CAPTURES_DIR, "diff", `${testInfo.project.name}-${route.name}.png`);
    const { diffRatio, diffPixels, totalPixels } = compareScreenshots(oracleBuf, currentBuf, diffPath);

    await testInfo.attach(`diff-${testInfo.project.name}-${route.name}`, {
      path: diffPath,
      contentType: "image/png",
    });
    console.log(
      `[paridad] ${testInfo.project.name}/${route.name}: ${(diffRatio * 100).toFixed(3)}% ` +
        `(${diffPixels}/${totalPixels}px)`,
    );

    expect(diffRatio, `paridad visual "${route.name}" — revisa el diff adjunto en el reporte`).toBeLessThan(
      PARITY_THRESHOLD,
    );
  });
}
