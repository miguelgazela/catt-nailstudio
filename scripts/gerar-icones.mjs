// Gera os ícones PWA e as imagens de arranque do iOS a partir de brand/logo-cn-crop.png.
// Uso: pnpm icones   (escreve em public/icons e public/splash; os PNG ficam no git).
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const raiz = fileURLToPath(new URL("..", import.meta.url));
const origem = `${raiz}brand/logo-cn-crop.png`; // 680x680, fundo creme, unha ao centro
const FUNDO = "#F7F1EC";

mkdirSync(`${raiz}public/icons`, { recursive: true });
mkdirSync(`${raiz}public/splash`, { recursive: true });

// "any" e apple-touch: recorte central (a unha ocupa mais do ícone).
// O Safari põe cantos arredondados sozinho, por isso o ícone é quadrado e opaco.
const recorte = 600;
const margem = (680 - recorte) / 2;
const centro = () =>
  sharp(origem).extract({ left: margem, top: margem, width: recorte, height: recorte });

for (const [nome, lado, fonte] of [
  ["icon-192.png", 192, centro()],
  ["icon-512.png", 512, centro()],
  ["apple-touch-icon.png", 180, centro()],
  // Maskable: imagem inteira. A unha (76 % da altura) cabe no círculo de segurança (80 %).
  ["icon-maskable-512.png", 512, sharp(origem)],
]) {
  await fonte.resize(lado, lado).png({ compressionLevel: 9 }).toFile(`${raiz}public/icons/${nome}`);
}

// Splash iOS: fundo da marca, cartão do logótipo ao centro (como o ecrã de abertura da app).
// Tamanhos em pixéis físicos; media query em pontos (largura x altura, ratio).
export const SPLASH = [
  { w: 1320, h: 2868, pw: 440, ph: 956, r: 3 }, // 16 Pro Max
  { w: 1206, h: 2622, pw: 402, ph: 874, r: 3 }, // 16 Pro
  { w: 1290, h: 2796, pw: 430, ph: 932, r: 3 }, // 14/15 Pro Max, 15/16 Plus
  { w: 1179, h: 2556, pw: 393, ph: 852, r: 3 }, // 14 Pro, 15, 15 Pro, 16
  { w: 1170, h: 2532, pw: 390, ph: 844, r: 3 }, // 12, 13, 14
  { w: 1125, h: 2436, pw: 375, ph: 812, r: 3 }, // X, XS, 11 Pro, mini
  { w: 828, h: 1792, pw: 414, ph: 896, r: 2 }, // XR, 11
];

for (const { w, h } of SPLASH) {
  const lado = Math.round(w * 0.4);
  const raio = Math.round(lado * 0.2);
  const mascara = Buffer.from(
    `<svg width="${lado}" height="${lado}"><rect width="${lado}" height="${lado}" rx="${raio}" ry="${raio}"/></svg>`,
  );
  const logo = await sharp(origem)
    .resize(lado, lado)
    .composite([{ input: mascara, blend: "dest-in" }])
    .png()
    .toBuffer();
  await sharp({ create: { width: w, height: h, channels: 3, background: FUNDO } })
    .composite([{ input: logo, left: Math.round((w - lado) / 2), top: Math.round((h - lado) / 2) - Math.round(h * 0.03) }])
    .png({ compressionLevel: 9, palette: true })
    .toFile(`${raiz}public/splash/${w}x${h}.png`);
}
console.log("Ícones e splash gerados.");
