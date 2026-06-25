/**
 * Gera build/icon.ico, build/icon.icns e build/icon.png
 * a partir dos SVGs em Image/Icons/ (DSX_ICO_WIN/MAC/LINUX).
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const pngToIco = require('png-to-ico');
const png2icons = require('png2icons');

const ROOT = path.join(__dirname, '..');
const BUILD_DIR = path.join(ROOT, 'build');

const SOURCES = {
  win: path.join(ROOT, 'Image/Icons/DSX_ICO_WIN.svg'),
  mac: path.join(ROOT, 'Image/Icons/DSX_ICO_MAC.svg'),
  linux: path.join(ROOT, 'Image/Icons/DSX_ICO_LINUX.svg'),
};

async function ensureSources() {
  for (const [platform, filePath] of Object.entries(SOURCES)) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Ícone ${platform} não encontrado: ${filePath}`);
    }
  }
}

async function writeLinuxIcon() {
  await sharp(SOURCES.linux)
    .resize(512, 512)
    .png()
    .toFile(path.join(BUILD_DIR, 'icon.png'));
}

async function writeWindowsIcon() {
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const pngBuffers = await Promise.all(
    sizes.map((size) => sharp(SOURCES.win).resize(size, size).png().toBuffer())
  );
  const ico = await pngToIco(pngBuffers);
  fs.writeFileSync(path.join(BUILD_DIR, 'icon.ico'), ico);
}

async function writeMacIcon() {
  const macPng = await sharp(SOURCES.mac).resize(1024, 1024).png().toBuffer();
  const icns = png2icons.createICNS(macPng, png2icons.BICUBIC, 0);
  if (!icns) {
    throw new Error('Falha ao gerar icon.icns a partir de DSX_ICO_MAC.svg');
  }
  fs.writeFileSync(path.join(BUILD_DIR, 'icon.icns'), icns);
}

async function main() {
  await ensureSources();
  fs.mkdirSync(BUILD_DIR, { recursive: true });
  await writeLinuxIcon();
  await writeWindowsIcon();
  await writeMacIcon();
  console.log('[icons] build/icon.png, build/icon.ico, build/icon.icns gerados.');
}

main().catch((err) => {
  console.error('[icons]', err.message || err);
  process.exit(1);
});
