#!/usr/bin/env node
/**
 * Exporta la home nueva como archivos estáticos para subirla a referencehome.es
 * (junto a Joomla). Resultado en dist-home/:
 *
 *   inicio.html        la home (el .htaccess hace que se vea en «/»)
 *   _next/             código y tipografías
 *   nueva/             fotos de la home
 *   videos/            vídeos
 *   images/…           las pocas imágenes de la home que viven en /images
 *
 * Uso: node scripts/export-home.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { execSync, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, ".next-export");
const OUT = path.join(ROOT, "dist-home");
const env = { ...process.env, NEXT_PUBLIC_EXPORT_HOME: "1", NEXT_PUBLIC_STATIC_FORMS: "1" };

function copy(src, dst) {
  if (!fs.existsSync(src)) throw new Error(`No existe ${path.relative(ROOT, src)}`);
  fs.cpSync(src, dst, { recursive: true });
}

console.log("1/3 Construyendo la versión estática…");
execSync("npx next build", { cwd: ROOT, env, stdio: "inherit" });

console.log("2/3 Reuniendo archivos…");
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const html = path.join(DIST, "server", "app", "index.html");
copy(html, path.join(OUT, "inicio.html"));
copy(path.join(DIST, "static"), path.join(OUT, "_next", "static"));
copy(path.join(ROOT, "public", "nueva"), path.join(OUT, "nueva"));
copy(path.join(ROOT, "public", "videos"), path.join(OUT, "videos"));

// Imágenes que la home pide desde /images (se suben a la carpeta images de
// Joomla, en subcarpetas propias, sin pisar nada).
const page = fs.readFileSync(html, "utf8");
// Solo el código que carga la home (los demás trozos son de otras páginas).
const used = new Set([...page.matchAll(/static\/chunks\/([A-Za-z0-9_\-/.~]+?\.js)/g)].map((m) => m[1]));
const chunks = [...used]
  .map((f) => path.join(OUT, "_next", "static", "chunks", f))
  .filter((f) => fs.existsSync(f))
  .map((f) => fs.readFileSync(f, "utf8"))
  .join("\n");
const refs = new Set([...(page + chunks).matchAll(/["'`](\/images\/[A-Za-z0-9_\-/.]+\.(?:jpg|jpeg|png|webp|avif|svg))["'`]/g)].map((m) => m[1]));
for (const ref of refs) {
  const src = path.join(ROOT, "public", ref);
  if (fs.existsSync(src)) {
    fs.mkdirSync(path.dirname(path.join(OUT, ref)), { recursive: true });
    fs.copyFileSync(src, path.join(OUT, ref));
  }
}

// Fotos JPG/PNG muy pesadas: se reducen a 2000 px de ancho como máximo
// (mismo nombre y formato, para no tocar el código).
execFileSync("python3", [
  "-I",
  "-c",
  [
    "import sys,os",
    "from PIL import Image",
    "for root,_,fs in os.walk(sys.argv[1]):",
    "  for f in fs:",
    "    p=os.path.join(root,f)",
    "    if f.lower().endswith(('.jpg','.jpeg','.png')) and os.path.getsize(p)>600000:",
    "      im=Image.open(p); w,h=im.size",
    "      if w>2000: im=im.resize((2000,round(h*2000/w)),Image.LANCZOS)",
    "      im.save(p,quality=82,optimize=True) if f.lower().endswith(('.jpg','.jpeg')) else im.save(p,optimize=True)",
  ].join("\n"),
  path.join(OUT, "images"),
]);

console.log("3/3 Comprobaciones…");
const problems = [];
if (page.includes("/_next/image")) problems.push("la página usa el optimizador de imágenes de Vercel");
if (/supabase\.co/.test(page + chunks)) problems.push("queda alguna referencia a Supabase");
if (!/rel="canonical" href="https:\/\/referencehome\.es\/?"/.test(page)) problems.push("falta la dirección canónica");
if (problems.length) {
  console.error("Revisar:\n- " + problems.join("\n- "));
  process.exitCode = 1;
}
const size = execSync(`du -sh ${JSON.stringify(OUT)}`).toString().split("\t")[0];
console.log(`Listo: dist-home/ (${size}), imágenes de /images: ${refs.size}`);
