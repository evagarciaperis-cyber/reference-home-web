import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),

  // Reglas de fronteras internas (docs/ARQUITECTURA.md, sección 2.8).
  // src/app puede importar de ui/motion/content/email; nunca al revés.
  {
    files: [
      "src/ui/**/*.{ts,tsx}",
      "src/motion/**/*.{ts,tsx}",
      "src/content/**/*.{ts,tsx}",
      "src/email/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app", "@/app/*"],
              message:
                "ui/motion/content/email no pueden importar de app (dirección de dependencia de un solo sentido, docs/ARQUITECTURA.md 2.8).",
            },
          ],
        },
      ],
    },
  },
  // content no depende de ui (docs/ARQUITECTURA.md, sección 2.8).
  {
    files: ["src/content/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app", "@/app/*", "@/ui", "@/ui/*"],
              message:
                "content no debe depender de ui ni de app (docs/ARQUITECTURA.md 2.8).",
            },
          ],
        },
      ],
    },
  },
  // <img> nativa deliberada, no next/image: la migración usa SVGs
  // vectoriales que no necesitan pipeline de optimización (ARQUITECTURA.md,
  // sección 11) y varios hooks de motion (useParallax, futuros WorkZoom/
  // ProjectsGallery) necesitan un <img> real consultable por
  // querySelector para aplicarle transform directamente, como el original.
  {
    files: ["src/ui/sections/**/*.{ts,tsx}"],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
]);

export default eslintConfig;
