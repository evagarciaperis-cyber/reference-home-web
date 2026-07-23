import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

export type DiffResult = {
  diffPixels: number;
  totalPixels: number;
  diffRatio: number;
};

/**
 * Compara dos capturas PNG píxel a píxel y escribe una imagen de diferencia
 * (magenta sobre las zonas distintas) en diffOutPath.
 */
export function compareScreenshots(
  oracleBuf: Buffer,
  currentBuf: Buffer,
  diffOutPath: string,
): DiffResult {
  const oracle = PNG.sync.read(oracleBuf);
  const current = PNG.sync.read(currentBuf);

  if (oracle.width !== current.width || oracle.height !== current.height) {
    throw new Error(
      `Tamaño de captura distinto: oráculo ${oracle.width}x${oracle.height} vs actual ${current.width}x${current.height}. ` +
        "Revisa que el viewport del test coincide con el usado para generar el oráculo.",
    );
  }

  const { width, height } = oracle;
  const diff = new PNG({ width, height });
  const diffPixels = pixelmatch(oracle.data, current.data, diff.data, width, height, {
    threshold: 0.1,
  });

  mkdirSync(dirname(diffOutPath), { recursive: true });
  writeFileSync(diffOutPath, PNG.sync.write(diff));

  const totalPixels = width * height;
  return { diffPixels, totalPixels, diffRatio: diffPixels / totalPixels };
}
