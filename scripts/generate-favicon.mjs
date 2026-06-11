import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import toIco from "to-ico";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const logoPath = path.join(root, "public", "logo-navarro.png");
const outDir = path.join(root, "public");

/** Recorte quadrado do símbolo "N" (sem textos) no logo Navarro. */
const CROP = { left: 100, top: 2, width: 110, height: 110 };

async function buildSymbol() {
  return sharp(logoPath).extract(CROP).png();
}

async function main() {
  const symbol = await buildSymbol();

  await symbol.clone().resize(32, 32).png().toFile(path.join(outDir, "favicon.png"));

  const icoSizes = [16, 32, 48];
  const icoBuffers = await Promise.all(
    icoSizes.map((size) => symbol.clone().resize(size, size).png().toBuffer())
  );
  fs.writeFileSync(path.join(outDir, "favicon.ico"), await toIco(icoBuffers));

  const appleSize = 180;
  const innerSize = 136;
  const appleBuffer = await sharp({
    create: {
      width: appleSize,
      height: appleSize,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([
      {
        input: await symbol.clone().resize(innerSize, innerSize).png().toBuffer(),
        gravity: "center",
      },
    ])
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(outDir, "apple-touch-icon.png"), appleBuffer);

  console.log("Favicons gerados em public/:");
  console.log("  favicon.ico (16, 32, 48px)");
  console.log("  favicon.png (32px)");
  console.log("  apple-touch-icon.png (180px)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
