import { defineConfig } from "@playwright/test";
import { ALL_VIEWPORTS } from "./e2e/matrix";

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  testMatch: ["**/*.spec.ts"],
  fullyParallel: true,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
  },
  // Build de producción, no dev server: sin overlay de HMR ni indicador de
  // dev, para que las capturas sean deterministas.
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: ALL_VIEWPORTS.map((vp) => ({
    name: vp.name,
    use: {
      viewport: { width: vp.width, height: vp.height },
      reducedMotion: (vp.reducedMotion ? "reduce" : "no-preference") as "reduce" | "no-preference",
    },
  })),
});
